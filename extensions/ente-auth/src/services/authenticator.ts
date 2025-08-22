// src/services/authenticator.ts
import { getStorageService } from "./storage";
import { getApiClient } from "./api";
import { AuthData, AuthCode, UserCredentials } from "../types";
import { decryptAuthEntity, decryptAuthKey, encryptAuthKey, generateAuthenticatorKey } from "./crypto";
import { generateTOTP, getProgress, getRemainingSeconds } from "../utils/totp";
import { showToast, Toast } from "@raycast/api";

// [+] More robust URI parsing function based on official web app's implementation
function parseAuthDataFromUri(uriString: string, entityId: string, updatedAt: number): AuthData | null {
  try {
    // CRITICAL FIX: Handle JSON-encoded strings with extra quotes from server
    // The decrypted data sometimes comes as JSON-encoded: "otpauth://..." instead of otpauth://...
    let cleanedUri = uriString;

    // Check if the URI string is JSON-encoded (starts and ends with quotes)
    if (cleanedUri.startsWith('"') && cleanedUri.endsWith('"')) {
      try {
        cleanedUri = JSON.parse(cleanedUri);
      } catch (jsonError) {
        console.warn(`DEBUG: Failed to parse JSON-encoded URI for entity ${entityId}:`, jsonError);
        // Continue with original string if JSON parsing fails
      }
    }

    // Handle potential encoding issues from older clients - legacy fix for # characters
    if (cleanedUri.includes("#")) {
      cleanedUri = cleanedUri.replaceAll("#", "%23");
    }

    const url = new URL(cleanedUri);

    // CRITICAL FIX: Parse codeDisplay metadata to check for trashed items and extract icon data
    // This matches the official web implementation's filtering behavior
    let codeDisplay: { trashed?: boolean; pinned?: boolean; iconSrc?: string; iconID?: string } | undefined;
    const codeDisplayParam = url.searchParams.get("codeDisplay");
    if (codeDisplayParam) {
      try {
        codeDisplay = JSON.parse(codeDisplayParam);

        // EXACT MATCH TO WEB IMPLEMENTATION: Filter out trashed entries
        if (codeDisplay && codeDisplay.trashed) {
          return null;
        }
      } catch (error) {
        console.warn(`DEBUG: Failed to parse codeDisplay for entity ${entityId}:`, error);
      }
    }

    // Parse type and path with browser compatibility fallbacks
    const [type, path] = parsePathname(url);

    const account = parseAccount(path);
    const issuer = parseIssuer(url, path);
    const secret = url.searchParams.get("secret");

    if (!secret) {
      console.warn(`Entity ${entityId} is missing a secret.`);
      return null;
    }

    // Parse numeric parameters with proper defaults
    const digits = parseInt(url.searchParams.get("digits") || (type === "steam" ? "5" : "6"), 10);
    const period = parseInt(url.searchParams.get("period") || "30", 10);
    const algorithm = parseAlgorithm(url);
    const counterParam = url.searchParams.get("counter");
    const counter = counterParam ? parseInt(counterParam, 10) : undefined;

    const result = {
      id: entityId,
      name: account || "Unknown Account",
      issuer: issuer || "Unknown",
      secret: secret.replace(/\s/g, "").toUpperCase(),
      type,
      algorithm,
      digits,
      period,
      counter,
      updatedAt,
      codeDisplay, // Include codeDisplay metadata for future use
    };
    return result;
  } catch (error) {
    console.error(`Failed to parse URI for entity ${entityId}: "${uriString}"`, error);
    return null;
  }
}

// Helper function to parse type and pathname - handles browser compatibility issues
function parsePathname(url: URL): [type: AuthData["type"], path: string] {
  // Handle different browser URL parsing behaviors for otpauth:// scheme
  switch (url.host.toLowerCase()) {
    case "totp":
      return ["totp", url.pathname.toLowerCase()];
    case "hotp":
      return ["hotp", url.pathname.toLowerCase()];
    case "steam":
      return ["steam", url.pathname.toLowerCase()];
    default:
      break;
  }

  // Fallback parsing for browsers that put everything in pathname
  const p = url.pathname.toLowerCase();
  if (p.startsWith("//totp")) return ["totp", url.pathname.slice(6)];
  if (p.startsWith("//hotp")) return ["hotp", url.pathname.slice(6)];
  if (p.startsWith("//steam")) return ["steam", url.pathname.slice(7)];

  throw new Error(`Unsupported code or unparseable path "${url.pathname}"`);
}

// Parse account name from path
function parseAccount(path: string): string | undefined {
  let p = decodeURIComponent(path);
  if (p.startsWith("/")) p = p.slice(1);
  if (p.includes(":")) p = p.split(":").slice(1).join(":");
  return p;
}

// Parse issuer with robust fallback logic
function parseIssuer(url: URL, path: string): string {
  // If there is an "issuer" search param, use that
  let issuer = url.searchParams.get("issuer");
  if (issuer) {
    // Handle bug in old versions of Ente Auth app where issuer had "period" appended
    if (issuer.endsWith("period")) {
      issuer = issuer.substring(0, issuer.length - 6);
    }
    return issuer;
  }

  // Otherwise extract issuer from path prefix
  let p = decodeURIComponent(path);
  if (p.startsWith("/")) p = p.slice(1);

  if (p.includes(":")) p = p.split(":")[0]!;
  else if (p.includes("-")) p = p.split("-")[0]!;

  return p || "Unknown";
}

// Parse algorithm with proper validation
function parseAlgorithm(url: URL): AuthData["algorithm"] {
  switch (url.searchParams.get("algorithm")?.toLowerCase()) {
    case "sha256":
      return "sha256";
    case "sha512":
      return "sha512";
    default:
      return "sha1";
  }
}

export class AuthenticatorService {
  private storage = getStorageService();
  private cachedDecryptionKey: Buffer | null = null; // Changed to Buffer for consistency

  async init(): Promise<boolean> {
    try {
      // First, try traditional credentials-based initialization
      const credentials = await this.storage.getCredentials();
      const masterKey = await this.storage.getMasterKey();

      if (credentials && masterKey) {
        return await this.initWithCredentials(credentials);
      }

      // Fallback: Try session restoration initialization
      return await this.initWithSessionRestoration();
    } catch (error) {
      console.error("DEBUG: 💥 AuthenticatorService init failed:", error);
      return false;
    }
  }

  private async initWithCredentials(credentials: UserCredentials): Promise<boolean> {
    // Get authentication context
    const authContext = await this.storage.getAuthenticationContext();

    // Initialize API client with token and authentication context
    const apiClient = await getApiClient();
    if (credentials.token) {
      apiClient.setToken(credentials.token);
    }

    if (authContext) {
      apiClient.setAuthenticationContext(authContext);
    } else {
      console.warn("DEBUG: No authentication context available - this may cause API failures");
    }

    // Try to get/setup authenticator key
    try {
      await this.getDecryptionKey();

      // SMART AUTO-SYNC FOR FRESH LOGIN: Check if we have local entities, if not, try to sync automatically
      const existingEntities = await this.storage.getAuthEntities();

      if (existingEntities.length === 0) {
        try {
          // Attempt automatic sync, but fail gracefully if offline
          await this.syncAuthenticator(false);
        } catch (error) {
          // Check if it's a network error
          const isNetworkError =
            error instanceof Error &&
            (error.message.includes("Network error") ||
              error.message.includes("ENOTFOUND") ||
              error.message.includes("ECONNREFUSED") ||
              error.message.includes("timeout"));

          if (isNetworkError) {
            // Network error during initialization - will work offline
          } else {
            // Other sync error during initialization
          }
          // Don't fail initialization due to sync errors - user can sync manually
        }
      } else {
        // Already have cached entities, no need to sync
      }
    } catch (error) {
      console.error("DEBUG: Failed to initialize authenticator key:", error);
      // Don't fail init if we can't get the auth key yet - it might be created later
    }
    return true;
  }

  private async initWithSessionRestoration(): Promise<boolean> {
    // Check if we have authentication context (needed for API calls)
    const authContext = await this.storage.getAuthenticationContext();
    if (!authContext) {
      return false;
    }

    // Verify API client is properly configured
    const apiClient = await getApiClient();

    // Try to use stored decrypted authenticator key first
    const storedAuthKey = await this.storage.getStoredDecryptedAuthKey();
    if (storedAuthKey) {
      this.cachedDecryptionKey = storedAuthKey;

      // SMART AUTO-SYNC: Check if we have local entities, if not, try to sync automatically
      const existingEntities = await this.storage.getAuthEntities();

      if (existingEntities.length === 0) {
        try {
          // Attempt automatic sync, but fail gracefully if offline
          await this.syncAuthenticator(false);
        } catch (error) {
          // Check if it's a network error
          const isNetworkError =
            error instanceof Error &&
            (error.message.includes("Network error") ||
              error.message.includes("ENOTFOUND") ||
              error.message.includes("ECONNREFUSED") ||
              error.message.includes("timeout"));

          if (isNetworkError) {
            // Network error during session restoration - will work offline
          } else {
            // Other sync error during session restoration
          }
          // Don't fail session restoration due to sync errors - user can sync manually
        }
      } else {
        // Already have cached entities, no need to sync
      }
      return true;
    }

    // CRITICAL FIX: Check if we have master key for decryption
    const masterKey = await this.storage.getMasterKey();
    if (!masterKey) {
      return false;
    }

    // If we have master key, try to fetch and decrypt authenticator key from API
    try {
      const authKey = await apiClient.getAuthKey();
      if (authKey) {
        this.cachedDecryptionKey = await decryptAuthKey(authKey.encryptedKey, authKey.header, masterKey);
        await this.storage.storeAuthKey(authKey);

        // Store decrypted key for future session restoration
        try {
          await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
        } catch {
          // Ignore errors when storing decrypted key for session restoration
        }
        return true;
      }
    } catch {
      // API call failed during session restoration
    }

    // If we get here, session restoration failed
    return false;
  }

  private async getDecryptionKey(): Promise<Buffer> {
    if (this.cachedDecryptionKey) {
      return this.cachedDecryptionKey;
    }

    const apiClient = await getApiClient();
    // getMasterKey now returns a Buffer
    const masterKey = await this.storage.getMasterKey();
    if (!masterKey) {
      throw new Error("Master key not available for getting decryption key.");
    }

    let authKey = await this.storage.getAuthKey();
    if (!authKey) {
      try {
        authKey = await apiClient.getAuthKey();
      } catch (error) {
        if ((error as Error).message === "AuthenticatorKeyNotFound") {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Setting up authenticator..." });

          const newAuthenticatorKey = await generateAuthenticatorKey();
          const { encryptedKeyB64, headerB64 } = await encryptAuthKey(newAuthenticatorKey, masterKey);

          authKey = await apiClient.createAuthKey(encryptedKeyB64, headerB64);

          this.cachedDecryptionKey = newAuthenticatorKey;
          await this.storage.storeAuthKey(authKey);

          // [PERSISTENCE FIX] Store decrypted key for session restoration
          try {
            await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
          } catch {
            // Ignore errors when storing decrypted key for session restoration
          }

          toast.style = Toast.Style.Success;
          toast.title = "Authenticator setup complete";
          return this.cachedDecryptionKey;
        }
        throw error;
      }
      await this.storage.storeAuthKey(authKey);
    } else {
      // Auth key already exists in storage
    }

    this.cachedDecryptionKey = await decryptAuthKey(authKey.encryptedKey, authKey.header, masterKey);

    // [PERSISTENCE FIX] Store decrypted key for session restoration
    try {
      await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
    } catch {
      // Ignore errors when storing decrypted key for session restoration
    }

    return this.cachedDecryptionKey;
  }

  // Clear cached keys when switching accounts
  clearCache(): void {
    this.cachedDecryptionKey = null;
  }

  async syncAuthenticator(forceCompleteSync: boolean = false): Promise<AuthData[]> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: forceCompleteSync ? "Force syncing all data..." : "Syncing...",
    });

    try {
      const apiClient = await getApiClient();
      const authenticatorKey = await this.getDecryptionKey();

      // FUNDAMENTAL FIX: Use simple Map approach matching official web implementation
      // This eliminates the dual storage complexity that causes deletion persistence issues
      const entityMap = new Map<string, AuthData>();

      // Only populate existing entities if not doing force sync
      if (!forceCompleteSync) {
        const currentEntities = await this.storage.getAuthEntities();
        currentEntities.forEach((e) => entityMap.set(e.id, e));
      } else {
        // Clear all storage locations to prevent stale data
        await this.storage.resetSyncState();
      }

      // CRITICAL FIX: Follow web implementation pattern exactly
      let sinceTime = 0;
      const storedLastSync = await this.storage.getLastSyncTime();

      // Only use stored timestamp if we have entities and not force sync
      if (entityMap.size > 0 && storedLastSync > 0 && !forceCompleteSync) {
        sinceTime = storedLastSync;
      } else {
        await this.storage.storeLastSyncTime(0);
      }

      const batchSize = 2500; // Match web implementation batch size
      let totalEntitiesProcessed = 0;
      let maxUpdatedAt = sinceTime;

      // SIMPLIFIED SYNC: Direct Map manipulation matching web implementation
      while (true) {
        const { diff: entities } = await apiClient.getAuthDiff(sinceTime, batchSize);

        if (entities.length === 0) {
          break;
        }

        // CORE FIX: Process changes exactly like official web implementation
        for (const change of entities) {
          maxUpdatedAt = Math.max(maxUpdatedAt, change.updatedAt);
          totalEntitiesProcessed++;

          if (change.isDeleted) {
            // EXACT MATCH TO WEB IMPLEMENTATION: Simple deletion
            entityMap.delete(change.id);
          } else if (change.encryptedData && change.header) {
            try {
              const decryptedJson = await decryptAuthEntity(change.encryptedData, change.header, authenticatorKey);
              const authData = parseAuthDataFromUri(decryptedJson, change.id, change.updatedAt);

              if (authData) {
                // EXACT MATCH TO WEB IMPLEMENTATION: Simple set operation
                entityMap.set(change.id, authData);
              } else {
                // CRITICAL FIX: If parseAuthDataFromUri returns null, it means the entity is trashed
                // Remove it from the map to match web implementation behavior
                entityMap.delete(change.id);
              }
            } catch (e) {
              console.error(`DEBUG: 💥 Failed to decrypt/parse entity ${change.id}:`, e);
            }
          }
        }

        // Update sinceTime for next batch (matching web implementation)
        sinceTime = maxUpdatedAt;

        // If we got fewer entities than batch size, we're done
        if (entities.length < batchSize) {
          break;
        }
      }

      // SIMPLIFIED STORAGE: Direct storage without dual-storage complexity
      const finalEntities = Array.from(entityMap.values());

      // Store directly using a simplified approach that bypasses dual storage issues
      await this.storeEntitiesDirectly(finalEntities);
      await this.storage.storeLastSyncTime(maxUpdatedAt);

      if (totalEntitiesProcessed > 0) {
        toast.style = Toast.Style.Success;
        toast.title = `Synced ${totalEntitiesProcessed} updates`;
        toast.message = `Now have ${finalEntities.length} codes`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Already up to date";
      }
      return finalEntities;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Sync error:", error);
      return await this.storage.getAuthEntities();
    }
  }

  // SIMPLIFIED STORAGE: Bypass dual storage complexity
  private async storeEntitiesDirectly(entities: AuthData[]): Promise<void> {
    try {
      // Try to store encrypted first
      await this.storage.storeAuthEntities(entities);
    } catch (error) {
      console.error("DEBUG: ❌ Failed to store entities:", error);
      throw error;
    }
  }

  // Offline-first getAuthCodes - no automatic network calls
  async getAuthCodes(): Promise<AuthCode[]> {
    const entities = await this.storage.getAuthEntities();

    // OFFLINE FIX: Don't trigger automatic sync - let user explicitly sync when ready
    // This prevents "Network error" messages when offline
    if (entities.length === 0) {
      // No cached entities found - user can sync manually when ready
    }

    return entities.map((entity) => {
      let code: string;
      let remainingSeconds: number | undefined;
      let progress: number | undefined;

      // Note: HOTP is not fully supported in this simplified version as it requires counter updates.
      if (entity.type === "hotp") {
        code = "------";
        // HOTP codes don't have time-based expiration
        remainingSeconds = undefined;
        progress = undefined;
      } else {
        // Handles 'totp' and 'steam' - fix the type casting issue
        const totpType = entity.type === "steam" ? "steam" : "totp";
        code = generateTOTP(entity.secret, entity.period, entity.digits, entity.algorithm, totpType);
        remainingSeconds = getRemainingSeconds(entity.period);
        progress = getProgress(entity.period);
      }

      return {
        ...entity,
        code,
        remainingSeconds,
        progress,
      };
    });
  }
}

// [+] Make this a proper singleton to avoid re-instantiating the service
let authenticatorServiceInstance: AuthenticatorService | null = null;
export const getAuthenticatorService = (): AuthenticatorService => {
  if (!authenticatorServiceInstance) {
    authenticatorServiceInstance = new AuthenticatorService();
  }
  return authenticatorServiceInstance;
};

// Add method to clear cached keys when switching accounts
export const clearAuthenticatorServiceCache = (): void => {
  if (authenticatorServiceInstance) {
    authenticatorServiceInstance.clearCache();
  }
};
