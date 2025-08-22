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
      console.log(`DEBUG: Detected JSON-encoded URI for entity ${entityId}, parsing...`);
      try {
        cleanedUri = JSON.parse(cleanedUri);
        console.log(`DEBUG: Successfully parsed JSON-encoded URI for entity ${entityId}`);
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
    console.log(`DEBUG: Parsing URI for entity ${entityId}: ${cleanedUri}`);

    // CRITICAL FIX: Parse codeDisplay metadata to check for trashed items
    // This matches the official web implementation's filtering behavior
    let codeDisplay: { trashed?: boolean; pinned?: boolean } | undefined;
    const codeDisplayParam = url.searchParams.get("codeDisplay");
    if (codeDisplayParam) {
      try {
        codeDisplay = JSON.parse(codeDisplayParam);
        console.log(`DEBUG: Parsed codeDisplay for entity ${entityId}:`, codeDisplay);

        // EXACT MATCH TO WEB IMPLEMENTATION: Filter out trashed entries
        if (codeDisplay.trashed) {
          console.log(`DEBUG: ❌ Entity ${entityId} is trashed, filtering out (matching web implementation)`);
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

    console.log(`DEBUG: Successfully parsed entity ${entityId}:`, result);
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
    console.log("DEBUG: 🚀 --- Starting AuthenticatorService Init (TRACING NETWORK CALLS) ---");

    try {
      // First, try traditional credentials-based initialization
      console.log("DEBUG: 🔍 Checking for credentials and master key...");
      const credentials = await this.storage.getCredentials();
      const masterKey = await this.storage.getMasterKey();

      if (credentials && masterKey) {
        console.log("DEBUG: ✅ Found credentials and master key, using traditional initialization");
        console.log("DEBUG: 🔐 About to call initWithCredentials (WATCH FOR NETWORK CALLS)");
        return await this.initWithCredentials(credentials);
      }

      // Fallback: Try session restoration initialization
      console.log("DEBUG: ❌ No credentials/master key available, attempting session restoration");
      console.log("DEBUG: 🔄 About to call initWithSessionRestoration (WATCH FOR NETWORK CALLS)");
      return await this.initWithSessionRestoration();
    } catch (error) {
      console.error("DEBUG: 💥 AuthenticatorService init failed:", error);
      console.log("DEBUG: 🕵️ INIT ERROR DETAILS:", {
        message: error instanceof Error ? error.message : "Unknown",
        stack: error instanceof Error ? error.stack : "No stack",
        name: error instanceof Error ? error.name : "Unknown",
      });
      console.log("DEBUG: --- AuthenticatorService Init Complete (Failure) ---");
      return false;
    }
  }

  private async initWithCredentials(credentials: UserCredentials): Promise<boolean> {
    console.log("DEBUG: 🔐 Initializing with full credentials and master key");

    // Get authentication context
    const authContext = await this.storage.getAuthenticationContext();
    console.log("DEBUG: Retrieved authentication context:", {
      hasContext: !!authContext,
      userId: authContext?.userId,
      accountKey: authContext?.accountKey ? authContext.accountKey.substring(0, 20) + "..." : "none",
    });

    // Initialize API client with token and authentication context
    const apiClient = await getApiClient();
    if (credentials.token) {
      apiClient.setToken(credentials.token);
    }

    if (authContext) {
      apiClient.setAuthenticationContext(authContext);
      console.log("DEBUG: Set authentication context on API client");
    } else {
      console.warn("DEBUG: No authentication context available - this may cause API failures");
    }

    // Try to get/setup authenticator key
    try {
      await this.getDecryptionKey();
      console.log("DEBUG: Authenticator key initialized successfully");

      // SMART AUTO-SYNC FOR FRESH LOGIN: Check if we have local entities, if not, try to sync automatically
      const existingEntities = await this.storage.getAuthEntities();
      console.log(
        `DEBUG: 📊 Found ${existingEntities.length} existing local entities during credentials initialization`,
      );

      if (existingEntities.length === 0) {
        console.log("DEBUG: 🔄 No local entities found during fresh login - attempting smart auto-sync");
        try {
          // Attempt automatic sync, but fail gracefully if offline
          const syncedEntities = await this.syncAuthenticator(false);
          console.log(
            `DEBUG: ✅ Smart auto-sync successful during fresh login - retrieved ${syncedEntities.length} entities`,
          );
        } catch (error) {
          // Check if it's a network error
          const isNetworkError =
            error instanceof Error &&
            (error.message.includes("Network error") ||
              error.message.includes("ENOTFOUND") ||
              error.message.includes("ECONNREFUSED") ||
              error.message.includes("timeout"));

          if (isNetworkError) {
            console.log(
              "DEBUG: 🌐 Network error during fresh login auto-sync - continuing offline (user can sync manually)",
            );
          } else {
            console.log("DEBUG: ⚠️ Non-network error during fresh login auto-sync:", error);
          }
          // Don't fail initialization due to sync errors - user can sync manually
        }
      } else {
        console.log("DEBUG: ✅ Found existing entities during fresh login - no auto-sync needed");
      }
    } catch (error) {
      console.error("DEBUG: Failed to initialize authenticator key:", error);
      // Don't fail init if we can't get the auth key yet - it might be created later
    }

    console.log("DEBUG: --- AuthenticatorService Init Complete (Success - Credentials with Smart Auto-Sync) ---");
    return true;
  }

  private async initWithSessionRestoration(): Promise<boolean> {
    console.log("DEBUG: 🔄 Attempting session restoration initialization");

    // Check if we have authentication context (needed for API calls)
    const authContext = await this.storage.getAuthenticationContext();
    if (!authContext) {
      console.log("DEBUG: No authentication context available for session restoration");
      return false;
    }

    console.log("DEBUG: Retrieved authentication context for session restoration:", {
      userId: authContext.userId,
      accountKey: authContext.accountKey ? authContext.accountKey.substring(0, 20) + "..." : "none",
    });

    // Verify API client is properly configured
    const apiClient = await getApiClient();

    // Try to use stored decrypted authenticator key first
    const storedAuthKey = await this.storage.getStoredDecryptedAuthKey();
    if (storedAuthKey) {
      console.log("DEBUG: 🔑 Found stored decrypted authenticator key, using for session restoration");
      this.cachedDecryptionKey = storedAuthKey;

      // SMART AUTO-SYNC: Check if we have local entities, if not, try to sync automatically
      const existingEntities = await this.storage.getAuthEntities();
      console.log(`DEBUG: 📊 Found ${existingEntities.length} existing local entities during session restoration`);

      if (existingEntities.length === 0) {
        console.log("DEBUG: 🔄 No local entities found during session restoration - attempting smart auto-sync");
        try {
          // Attempt automatic sync, but fail gracefully if offline
          const syncedEntities = await this.syncAuthenticator(false);
          console.log(
            `DEBUG: ✅ Smart auto-sync successful - retrieved ${syncedEntities.length} entities during session restoration`,
          );
        } catch (error) {
          // Check if it's a network error
          const isNetworkError =
            error instanceof Error &&
            (error.message.includes("Network error") ||
              error.message.includes("ENOTFOUND") ||
              error.message.includes("ECONNREFUSED") ||
              error.message.includes("timeout"));

          if (isNetworkError) {
            console.log(
              "DEBUG: 🌐 Network error during session restoration auto-sync - continuing offline (user can sync manually)",
            );
          } else {
            console.log("DEBUG: ⚠️ Non-network error during session restoration auto-sync:", error);
          }
          // Don't fail session restoration due to sync errors - user can sync manually
        }
      } else {
        console.log("DEBUG: ✅ Found existing entities during session restoration - no auto-sync needed");
      }

      console.log("DEBUG: ✅ Session restoration successful with smart auto-sync");
      console.log("DEBUG: 🔄 Using cached authenticator key with automatic entity sync");

      console.log(
        "DEBUG: --- AuthenticatorService Init Complete (Success - Session Restoration with Smart Auto-Sync) ---",
      );
      return true;
    }

    // CRITICAL FIX: Check if we have master key for decryption
    const masterKey = await this.storage.getMasterKey();
    if (!masterKey) {
      console.log("DEBUG: ❌ No master key available for session restoration");
      console.log("DEBUG: Session restoration incomplete - cannot decrypt authenticator key without master key");
      console.log("DEBUG: User will need to re-authenticate to restore full session");
      console.log("DEBUG: --- AuthenticatorService Init Complete (Failure - Missing Master Key) ---");
      return false;
    }

    // If we have master key, try to fetch and decrypt authenticator key from API
    console.log("DEBUG: ✅ Master key available, attempting to fetch and decrypt authenticator key from API");
    try {
      const authKey = await apiClient.getAuthKey();
      if (authKey) {
        console.log("DEBUG: 🔑 Got encrypted auth key from API, decrypting with master key");
        this.cachedDecryptionKey = await decryptAuthKey(authKey.encryptedKey, authKey.header, masterKey);
        await this.storage.storeAuthKey(authKey);

        // Store decrypted key for future session restoration
        try {
          await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
          console.log("DEBUG: ✅ Stored decrypted authenticator key for future session restoration");
        } catch (error) {
          console.log("DEBUG: ⚠️ Failed to store decrypted authenticator key:", error);
        }

        console.log("DEBUG: ✅ Session restoration complete with full cryptographic context");
        console.log(
          "DEBUG: --- AuthenticatorService Init Complete (Success - Session Restoration with Decryption) ---",
        );
        return true;
      }
    } catch (error) {
      console.log("DEBUG: Failed to fetch/decrypt auth key from API during session restoration:", error);
    }

    // If we get here, session restoration failed
    console.log("DEBUG: ❌ Session restoration failed - no authenticator key available");
    console.log("DEBUG: --- AuthenticatorService Init Complete (Failure - No Authenticator Key) ---");
    return false;
  }

  private async getDecryptionKey(): Promise<Buffer> {
    if (this.cachedDecryptionKey) {
      console.log("DEBUG: Using cached authenticator decryption key.");
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
      console.log("DEBUG: No local auth key found. Fetching from API...");
      try {
        authKey = await apiClient.getAuthKey();
        console.log("DEBUG: Fetched auth key from API.");
      } catch (error) {
        if ((error as Error).message === "AuthenticatorKeyNotFound") {
          console.log("DEBUG: No auth key on server, creating a new one.");
          const toast = await showToast({ style: Toast.Style.Animated, title: "Setting up authenticator..." });

          const newAuthenticatorKey = await generateAuthenticatorKey();
          const { encryptedKeyB64, headerB64 } = await encryptAuthKey(newAuthenticatorKey, masterKey);

          authKey = await apiClient.createAuthKey(encryptedKeyB64, headerB64);
          console.log("DEBUG: Created and stored new auth key on server.");

          this.cachedDecryptionKey = newAuthenticatorKey;
          await this.storage.storeAuthKey(authKey);

          // [PERSISTENCE FIX] Store decrypted key for session restoration
          try {
            await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
          } catch (error) {
            console.log("DEBUG: ⚠️ Failed to store new authenticator key for session restoration:", error);
          }

          toast.style = Toast.Style.Success;
          toast.title = "Authenticator setup complete";
          return this.cachedDecryptionKey;
        }
        throw error;
      }
      await this.storage.storeAuthKey(authKey);
    } else {
      console.log("DEBUG: Using auth key from local storage.");
    }

    this.cachedDecryptionKey = await decryptAuthKey(authKey.encryptedKey, authKey.header, masterKey);
    console.log("DEBUG: Successfully decrypted authenticator key.");

    // [PERSISTENCE FIX] Store decrypted key for session restoration
    try {
      await this.storage.storeDecryptedAuthKey(this.cachedDecryptionKey);
    } catch (error) {
      console.log("DEBUG: ⚠️ Failed to store decrypted authenticator key for session restoration:", error);
    }

    return this.cachedDecryptionKey;
  }

  // Clear cached keys when switching accounts
  clearCache(): void {
    console.log("DEBUG: 🧹 Clearing authenticator service cache");
    this.cachedDecryptionKey = null;
    console.log("DEBUG: ✅ Authenticator cache cleared");
  }

  async syncAuthenticator(forceCompleteSync: boolean = false): Promise<AuthData[]> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: forceCompleteSync ? "Force syncing all data..." : "Syncing...",
    });
    console.log(`DEBUG: --- Starting SIMPLIFIED Sync (forceCompleteSync: ${forceCompleteSync}) ---`);

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
        console.log(`DEBUG: Starting with ${entityMap.size} local entities (incremental sync).`);
      } else {
        console.log("DEBUG: Force sync - starting with empty entity map (complete refresh)");
        // Clear all storage locations to prevent stale data
        await this.storage.resetSyncState();
      }

      // CRITICAL FIX: Follow web implementation pattern exactly
      let sinceTime = 0;
      const storedLastSync = await this.storage.getLastSyncTime();

      // Only use stored timestamp if we have entities and not force sync
      if (entityMap.size > 0 && storedLastSync > 0 && !forceCompleteSync) {
        sinceTime = storedLastSync;
        console.log("DEBUG: Using stored sync timestamp for incremental sync:", sinceTime);
      } else {
        console.log("DEBUG: Starting from timestamp 0 (matching official web implementation)");
        await this.storage.storeLastSyncTime(0);
      }

      const batchSize = 2500; // Match web implementation batch size
      let totalEntitiesProcessed = 0;
      let maxUpdatedAt = sinceTime;

      // SIMPLIFIED SYNC: Direct Map manipulation matching web implementation
      while (true) {
        console.log(`DEBUG: Fetching batch since timestamp: ${sinceTime}, limit: ${batchSize}`);
        const { diff: entities } = await apiClient.getAuthDiff(sinceTime, batchSize);
        console.log(`DEBUG: Received ${entities.length} entities in this batch.`);

        if (entities.length === 0) {
          console.log("DEBUG: No more entities to sync, batch complete.");
          break;
        }

        // CORE FIX: Process changes exactly like official web implementation
        for (const change of entities) {
          maxUpdatedAt = Math.max(maxUpdatedAt, change.updatedAt);
          totalEntitiesProcessed++;

          if (change.isDeleted) {
            // EXACT MATCH TO WEB IMPLEMENTATION: Simple deletion
            const wasDeleted = entityMap.delete(change.id);
            console.log(
              `DEBUG: ${wasDeleted ? "✅" : "⚠️"} ${wasDeleted ? "Deleted" : "Already missing"} entity ${change.id}`,
            );
          } else if (change.encryptedData && change.header) {
            try {
              const decryptedJson = await decryptAuthEntity(change.encryptedData, change.header, authenticatorKey);
              const authData = parseAuthDataFromUri(decryptedJson, change.id, change.updatedAt);

              if (authData) {
                // EXACT MATCH TO WEB IMPLEMENTATION: Simple set operation
                entityMap.set(change.id, authData);
                console.log(`DEBUG: ✅ Updated entity ${change.id}: ${authData.issuer || authData.name}`);
              } else {
                // CRITICAL FIX: If parseAuthDataFromUri returns null, it means the entity is trashed
                // Remove it from the map to match web implementation behavior
                const wasDeleted = entityMap.delete(change.id);
                console.log(`DEBUG: 🗑️ ${wasDeleted ? "Removed trashed" : "Trashed (not in map)"} entity ${change.id}`);
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
          console.log("DEBUG: Received partial batch, sync complete.");
          break;
        }
      }

      // SIMPLIFIED STORAGE: Direct storage without dual-storage complexity
      const finalEntities = Array.from(entityMap.values());
      console.log(`DEBUG: 💾 Storing ${finalEntities.length} entities using simplified storage`);

      // Store directly using a simplified approach that bypasses dual storage issues
      await this.storeEntitiesDirectly(finalEntities);
      await this.storage.storeLastSyncTime(maxUpdatedAt);

      console.log(
        `DEBUG: ✅ Simplified sync complete - processed ${totalEntitiesProcessed} changes, final count: ${finalEntities.length}. New sync time: ${maxUpdatedAt}`,
      );

      if (totalEntitiesProcessed > 0) {
        toast.style = Toast.Style.Success;
        toast.title = `Synced ${totalEntitiesProcessed} updates`;
        toast.message = `Now have ${finalEntities.length} codes`;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Already up to date";
      }

      console.log("DEBUG: --- Simplified Sync Finished (Success) ---");
      return finalEntities;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sync failed";
      toast.message = error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Sync error:", error);
      console.log("DEBUG: --- Simplified Sync Finished (Failure) ---");
      return await this.storage.getAuthEntities();
    }
  }

  // SIMPLIFIED STORAGE: Bypass dual storage complexity
  private async storeEntitiesDirectly(entities: AuthData[]): Promise<void> {
    console.log(`DEBUG: 💾 Storing ${entities.length} entities with simplified approach`);

    try {
      // Try to store encrypted first
      await this.storage.storeAuthEntities(entities);
      console.log("DEBUG: ✅ Entities stored successfully (simplified)");
    } catch (error) {
      console.error("DEBUG: ❌ Failed to store entities:", error);
      throw error;
    }
  }

  // Offline-first getAuthCodes - no automatic network calls
  async getAuthCodes(): Promise<AuthCode[]> {
    const entities = await this.storage.getAuthEntities();
    console.log(`DEBUG: getAuthCodes found ${entities.length} local entities (offline-first).`);

    // OFFLINE FIX: Don't trigger automatic sync - let user explicitly sync when ready
    // This prevents "Network error" messages when offline
    if (entities.length === 0) {
      console.log("DEBUG: No local entities found, but not triggering automatic sync (offline-first approach)");
      console.log("DEBUG: User can manually sync when they have internet connection");
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
    console.log("DEBUG: 🧹 Clearing cached authenticator decryption key for account switch");
    authenticatorServiceInstance.clearCache();
  }
};
