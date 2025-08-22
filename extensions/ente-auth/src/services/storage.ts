// src/services/storage.ts
import { LocalStorage } from "@raycast/api";
import { AuthData, AuthKey, UserCredentials, AuthenticationContext } from "../types";
import { bufToBase64, base64ToBuf } from "./crypto";
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { validateStorageOperation, validateToken } from "../utils/validation";
import { logSecureError } from "../utils/errorHandling";

const STORAGE_SALT = "ente-raycast-local-storage-salt";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface SecureStorageOptions {
  requireEncryption: boolean;
  fallbackBehavior: "fail" | "memory-only";
}

export class StorageService {
  private masterKey: Buffer | null = null;
  private storageEncryptionKey: Buffer | null = null;
  private memoryStorage: Map<string, unknown> = new Map(); // Secure memory-only storage

  private async getStorageEncryptionKey(): Promise<Buffer> {
    if (this.storageEncryptionKey) {
      return this.storageEncryptionKey;
    }

    const masterKey = await this.getMasterKey();
    if (!masterKey) throw new Error("Master key is not set. Cannot derive storage key.");

    this.storageEncryptionKey = pbkdf2Sync(masterKey, STORAGE_SALT, 100000, 32, "sha256");

    return this.storageEncryptionKey;
  }

  /**
   * Checks if encryption is available for secure storage
   * SECURITY: Validates encryption capability before storing sensitive data
   */
  private async isEncryptionAvailable(): Promise<boolean> {
    try {
      const masterKey = await this.getMasterKey();
      return masterKey !== null;
    } catch (error) {
      logSecureError(error, "isEncryptionAvailable");
      return false;
    }
  }

  // ... (encryptData and decryptData are correct and don't need changes)
  private async encryptData(data: string): Promise<string> {
    const key = await this.getStorageEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  private async decryptData(encryptedString: string): Promise<string> {
    const key = await this.getStorageEncryptionKey();
    const parts = encryptedString.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted data format.");
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private async decryptCredentials(encryptedString: string): Promise<string> {
    // Use a fixed key derivation for credentials to avoid circular dependency
    const credentialKey = pbkdf2Sync("ente-credentials", STORAGE_SALT, 100000, 32, "sha256");
    const parts = encryptedString.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted data format.");
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, credentialKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private async encryptCredentials(data: string): Promise<string> {
    // Use a fixed key derivation for credentials to avoid circular dependency
    const credentialKey = pbkdf2Sync("ente-credentials", STORAGE_SALT, 100000, 32, "sha256");
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, credentialKey, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  async getMasterKey(): Promise<Buffer | null> {
    // [+] Use Buffer type - only return in-memory master key to avoid circular dependency
    return this.masterKey;
  }

  setMasterKey(key: Buffer) {
    // [+] Use Buffer type
    this.masterKey = key;
  }

  async storeCredentials(credentials: UserCredentials): Promise<void> {
    // Set master key first - credentials are self-contained with their own master key
    this.masterKey = credentials.masterKey;

    const storableCredentials = {
      ...credentials,
      masterKey: bufToBase64(credentials.masterKey), // Convert Buffer to Base64 for JSON
    };

    try {
      const encrypted = await this.encryptCredentials(JSON.stringify(storableCredentials));
      await LocalStorage.setItem("credentials", encrypted);

      console.log("DEBUG: ✅ Credentials stored securely (encrypted)");
    } catch (error) {
      logSecureError(error, "storeCredentials");
      throw new Error("Failed to store credentials securely");
    }
  }

  async getCredentials(): Promise<UserCredentials | null> {
    const encryptedData = (await LocalStorage.getItem("credentials")) as string | undefined;
    if (!encryptedData) {
      return null;
    }

    try {
      // First try credential-specific decryption (new method)
      const decrypted = await this.decryptCredentials(encryptedData);
      const storedCreds = JSON.parse(decrypted);

      const credentials: UserCredentials = {
        ...storedCreds,
        masterKey: base64ToBuf(storedCreds.masterKey), // Convert Base64 back to Buffer
      };

      this.masterKey = credentials.masterKey;
      return credentials;
    } catch (newMethodError) {
      // Fallback: Try old decryption method if master key is available from session restoration
      if (this.masterKey) {
        try {
          const decrypted = await this.decryptData(encryptedData);
          const storedCreds = JSON.parse(decrypted);

          const credentials: UserCredentials = {
            ...storedCreds,
            masterKey: base64ToBuf(storedCreds.masterKey), // Convert Base64 back to Buffer
          };

          // Re-encrypt with new method for future use
          await this.storeCredentials(credentials);
          return credentials;
        } catch (oldMethodError) {
          console.error("Failed to decrypt credentials with both methods:", {
            newMethod: newMethodError,
            oldMethod: oldMethodError,
          });
        }
      } else {
        console.error("Failed to decrypt credentials (no master key for fallback):", newMethodError);
      }
      return null;
    }
  }

  // ... (rest of the file is okay and doesn't need changes)
  async storeAuthKey(authKey: AuthKey): Promise<void> {
    const encrypted = await this.encryptData(JSON.stringify(authKey));
    await LocalStorage.setItem("authKey", encrypted);
  }

  async getAuthKey(): Promise<AuthKey | null> {
    const encryptedData = (await LocalStorage.getItem("authKey")) as string | undefined;
    if (!encryptedData) return null;
    try {
      const decrypted = await this.decryptData(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Failed to decrypt auth key:", error);
      return null;
    }
  }

  async storeAuthEntities(
    entities: AuthData[],
    options: SecureStorageOptions = { requireEncryption: true, fallbackBehavior: "fail" },
  ): Promise<void> {
    // Validate storage operation
    const validation = validateStorageOperation({
      requireEncryption: options.requireEncryption,
      data: entities,
      encryptionAvailable: await this.isEncryptionAvailable(),
    });

    if (!validation.isValid) {
      logSecureError(new Error(validation.error || "Storage validation failed"), "storeAuthEntities");
      throw new Error("Cannot store data securely: encryption required but not available");
    }

    try {
      // Always clear both storage locations first to prevent stale data
      await LocalStorage.removeItem("authEntities");
      await LocalStorage.removeItem("authEntities_unencrypted");

      const encrypted = await this.encryptData(JSON.stringify(entities));
      await LocalStorage.setItem("authEntities", encrypted);
    } catch (error) {
      logSecureError(error, "storeAuthEntities");

      // SECURITY FIX: Remove plaintext fallback - fail securely instead
      if (options.fallbackBehavior === "memory-only") {
        // Store in secure memory only as temporary fallback
        this.memoryStorage.set("authEntities", entities);
        console.log("DEBUG: Stored auth entities in secure memory-only mode");
        return;
      }

      throw new Error("Failed to store auth entities securely");
    }
  }

  async getAuthEntities(): Promise<AuthData[]> {
    let encryptedEntities: AuthData[] = [];
    let unencryptedEntities: AuthData[] = [];
    let useEncrypted = false;

    // First try encrypted version
    const encryptedData = (await LocalStorage.getItem("authEntities")) as string | undefined;
    if (encryptedData) {
      try {
        const decrypted = await this.decryptData(encryptedData);
        encryptedEntities = JSON.parse(decrypted);
        useEncrypted = true;
        // console.log(`DEBUG: ✅ Retrieved ${encryptedEntities.length} auth entities (encrypted)`);
      } catch {
        // console.log("DEBUG: ⚠️ Failed to decrypt auth entities, trying unencrypted fallback");
      }
    }

    // Check unencrypted version (used during session restoration)
    const unencryptedData = (await LocalStorage.getItem("authEntities_unencrypted")) as string | undefined;
    if (unencryptedData) {
      try {
        unencryptedEntities = JSON.parse(unencryptedData);
        // console.log(`DEBUG: 📋 Found ${unencryptedEntities.length} auth entities (unencrypted fallback)`);
      } catch (error) {
        console.error("Failed to parse unencrypted auth entities:", error);
      }
    }

    // DELETION FIX: Choose the most recent/complete data source
    if (useEncrypted && encryptedEntities.length > 0) {
      // Prefer encrypted data when available
      if (unencryptedEntities.length > 0) {
        // console.log("DEBUG: 🔍 Both encrypted and unencrypted entities found, using encrypted (more recent)");
      }
      return encryptedEntities;
    } else if (unencryptedEntities.length > 0) {
      // console.log("DEBUG: ✅ Using unencrypted fallback entities");
      return unencryptedEntities;
    }

    // console.log("DEBUG: ❌ No auth entities found");
    return [];
  }

  async storeLastSyncTime(time: number): Promise<void> {
    await LocalStorage.setItem("lastSyncTime", time.toString());
  }

  async getLastSyncTime(): Promise<number> {
    const time = (await LocalStorage.getItem("lastSyncTime")) as string | undefined;
    return time ? parseInt(time, 10) : 0;
  }

  async storeAuthenticationContext(
    context: AuthenticationContext,
    options: SecureStorageOptions = { requireEncryption: false, fallbackBehavior: "memory-only" },
  ): Promise<void> {
    // Validate storage operation
    const validation = validateStorageOperation({
      requireEncryption: options.requireEncryption,
      data: context,
      encryptionAvailable: await this.isEncryptionAvailable(),
    });

    if (!validation.isValid && options.requireEncryption) {
      logSecureError(new Error(validation.error || "Storage validation failed"), "storeAuthenticationContext");
      throw new Error("Cannot store authentication context securely: encryption required but not available");
    }

    try {
      // Always clear both storage locations first
      await LocalStorage.removeItem("authenticationContext");
      await LocalStorage.removeItem("authenticationContext_unencrypted");

      const encrypted = await this.encryptData(JSON.stringify(context));
      await LocalStorage.setItem("authenticationContext", encrypted);
      console.log("DEBUG: ✅ Authentication context stored (encrypted)");
    } catch (error) {
      logSecureError(error, "storeAuthenticationContext");

      // SECURITY FIX: Only use memory fallback, no plaintext storage
      if (options.fallbackBehavior === "memory-only") {
        this.memoryStorage.set("authenticationContext", context);
        console.log("DEBUG: Stored authentication context in secure memory-only mode");
        return;
      }

      throw new Error("Failed to store authentication context securely");
    }
  }

  async getAuthenticationContext(): Promise<AuthenticationContext | null> {
    // First try encrypted version
    const encryptedData = (await LocalStorage.getItem("authenticationContext")) as string | undefined;
    if (encryptedData) {
      try {
        const decrypted = await this.decryptData(encryptedData);
        // console.log("DEBUG: ✅ Retrieved authentication context (encrypted)");
        return JSON.parse(decrypted);
      } catch {
        // console.log("DEBUG: ⚠️ Failed to decrypt authentication context, trying unencrypted fallback");
      }
    }

    // Fallback to unencrypted version (used during session restoration)
    const unencryptedData = (await LocalStorage.getItem("authenticationContext_unencrypted")) as string | undefined;
    if (unencryptedData) {
      try {
        // console.log("DEBUG: ✅ Retrieved authentication context (unencrypted fallback)");
        return JSON.parse(unencryptedData);
      } catch (error) {
        console.error("Failed to parse unencrypted authentication context:", error);
      }
    }

    // console.log("DEBUG: ❌ No authentication context found");
    return null;
  }

  // [+] Add token lifecycle management methods matching web app
  async storeEncryptedToken(userId: number, encryptedToken: string): Promise<void> {
    // console.log("DEBUG: Storing encrypted token for later decryption (web app pattern)");
    const tokenData = {
      userId,
      encryptedToken,
      timestamp: Date.now(),
    };
    const encrypted = await this.encryptData(JSON.stringify(tokenData));
    await LocalStorage.setItem("encryptedToken", encrypted);
  }

  async getEncryptedToken(): Promise<{ userId: number; encryptedToken: string } | null> {
    const encryptedData = (await LocalStorage.getItem("encryptedToken")) as string | undefined;
    if (!encryptedData) return null;
    try {
      const decrypted = await this.decryptData(encryptedData);
      const tokenData = JSON.parse(decrypted);
      return {
        userId: tokenData.userId,
        encryptedToken: tokenData.encryptedToken,
      };
    } catch (error) {
      console.error("Failed to decrypt stored encrypted token:", error);
      return null;
    }
  }

  async clearEncryptedToken(): Promise<void> {
    await LocalStorage.removeItem("encryptedToken");
  }

  // Session token storage - unencrypted for session restoration
  async storeSessionToken(token: string, email: string, userId: number): Promise<void> {
    // Validate session token before storage
    const tokenValidation = validateToken(token);
    if (!tokenValidation.isValid) {
      logSecureError(new Error(tokenValidation.error || "Invalid token"), "storeSessionToken");
      throw new Error("Cannot store invalid session token");
    }

    try {
      const sessionData = {
        token,
        email,
        userId,
        timestamp: Date.now(),
        userAgent: "Raycast/Ente-Auth/1.0.0",
      };

      // Store session token unencrypted since it's already a derived session token
      // This allows session restoration without master key circular dependency
      await LocalStorage.setItem("persistentSession", JSON.stringify(sessionData));

      console.log("DEBUG: ✅ Session token stored for persistence");
    } catch (error) {
      logSecureError(error, "storeSessionToken");
      throw new Error("Failed to store session token");
    }
  }

  async getStoredSessionToken(): Promise<{ token: string; email: string; userId: number; userAgent: string } | null> {
    try {
      const sessionData = (await LocalStorage.getItem("persistentSession")) as string | undefined;
      if (!sessionData) {
        // console.log("DEBUG: No persistent session found");
        return null;
      }

      // Parse session data directly (stored unencrypted for session restoration)
      const parsed = JSON.parse(sessionData);
      // console.log("DEBUG: 🔍 Found stored session for user:", parsed.userId);
      // console.log("DEBUG: Session age:", Math.floor((Date.now() - parsed.timestamp) / 1000 / 60), "minutes");

      return {
        token: parsed.token,
        email: parsed.email,
        userId: parsed.userId,
        userAgent: parsed.userAgent || "Raycast/Ente-Auth/1.0.0",
      };
    } catch (error) {
      console.error("DEBUG: Failed to parse stored session:", error);
      // Clear corrupted session data
      await this.clearStoredSessionToken();
      return null;
    }
  }

  async clearStoredSessionToken(): Promise<void> {
    await LocalStorage.removeItem("persistentSession");
    // console.log("DEBUG: 🗑️ Cleared stored session token");
  }

  // Legacy method for backward compatibility
  async activateToken(token: string): Promise<void> {
    // console.log("DEBUG: Activating token for API access (legacy method)");
    await LocalStorage.setItem("activeToken", token);
  }

  async getActiveToken(): Promise<string | null> {
    return (await LocalStorage.getItem("activeToken")) as string | null;
  }

  async clearActiveToken(): Promise<void> {
    await LocalStorage.removeItem("activeToken");
  }

  // [+] Update credentials to include partial state (matching web app pattern)
  async storePartialCredentials(email: string, userId?: number, encryptedToken?: string): Promise<void> {
    const partialCreds = {
      email,
      userId,
      encryptedToken,
      timestamp: Date.now(),
    };
    const encrypted = await this.encryptData(JSON.stringify(partialCreds));
    await LocalStorage.setItem("partialCredentials", encrypted);
  }

  async getPartialCredentials(): Promise<{ email: string; userId?: number; encryptedToken?: string } | null> {
    const encryptedData = (await LocalStorage.getItem("partialCredentials")) as string | undefined;
    if (!encryptedData) return null;
    try {
      const decrypted = await this.decryptData(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Failed to decrypt partial credentials:", error);
      return null;
    }
  }

  async clearPartialCredentials(): Promise<void> {
    await LocalStorage.removeItem("partialCredentials");
  }

  async clearAll(): Promise<void> {
    // console.log("DEBUG: 🧹 Clearing all stored data and resetting service state");
    this.masterKey = null;
    this.storageEncryptionKey = null;
    await LocalStorage.clear();
    // console.log("DEBUG: ✅ All data cleared and service reset");
  }

  // SECURITY FIX: Removed storeDecryptedAuthKey() function entirely
  // This function was storing sensitive authenticator keys in plaintext which is a critical security vulnerability
  // Applications should re-derive authenticator keys from encrypted sources when needed

  // [PERSISTENCE FIX] Clean up failed session restoration attempts
  async cleanupFailedSessionRestoration(): Promise<void> {
    // console.log("DEBUG: 🧹 Cleaning up failed session restoration data");
    await LocalStorage.removeItem("authenticationContext_unencrypted");
    await LocalStorage.removeItem("authEntities_unencrypted");
    await LocalStorage.removeItem("decryptedAuthKey");
    // console.log("DEBUG: ✅ Cleaned up unencrypted authentication context, auth entities, and decrypted auth key");
  }

  // DELETION FIX: Consistent entity update that handles both storage locations
  async updateAuthEntitiesFromSync(
    currentEntities: Map<string, AuthData>,
    entityChanges: Array<{ id: string; isDeleted: boolean; entityData?: AuthData }>,
  ): Promise<AuthData[]> {
    // console.log(`DEBUG: 🔄 Processing ${entityChanges.length} entity changes for consistent storage`);

    // Apply all changes to the entity map
    for (const change of entityChanges) {
      if (change.isDeleted) {
        currentEntities.delete(change.id);
        // console.log(`DEBUG: ❌ Deleted entity ${change.id}`);
      } else if (change.entityData) {
        currentEntities.set(change.id, change.entityData);
        // console.log(`DEBUG: ✅ Updated entity ${change.id}`);
      }
    }

    const updatedEntities = Array.from(currentEntities.values());
    // console.log(
    //   `DEBUG: 📊 Applied ${deletionCount} deletions and ${updateCount} updates. Final count: ${updatedEntities.length}`,
    // );

    // CRITICAL FIX: Force store to unencrypted during session restoration when no master key
    const masterKey = await this.getMasterKey();
    if (!masterKey) {
      // console.log(
      //   `DEBUG: 🔄 No master key available - forcing unencrypted storage for ${updatedEntities.length} entities`,
      // );
      await LocalStorage.setItem("authEntities_unencrypted", JSON.stringify(updatedEntities));
      // console.log(`DEBUG: ✅ Forced unencrypted storage update with deletions applied`);
    } else {
      // Store with our improved storage method that cleans up stale data
      await this.storeAuthEntities(updatedEntities);
    }

    // DELETION FIX: Also ensure both storage locations are cleaned up for deletions
    const deletedIds = entityChanges.filter((c) => c.isDeleted).map((c) => c.id);
    if (deletedIds.length > 0) {
      await this.ensureDeletionsInAllStorageLocations(deletedIds);
    }

    return updatedEntities;
  }

  // DELETION FIX: Ensure deletions are reflected in all storage locations
  private async ensureDeletionsInAllStorageLocations(deletedIds: string[]): Promise<void> {
    // console.log(`DEBUG: 🧹 Ensuring ${deletedIds.length} deletions are reflected in all storage locations`);

    // Check and clean unencrypted storage if it exists
    const unencryptedData = (await LocalStorage.getItem("authEntities_unencrypted")) as string | undefined;
    if (unencryptedData) {
      try {
        const unencryptedEntities: AuthData[] = JSON.parse(unencryptedData);
        const originalCount = unencryptedEntities.length;

        // Remove deleted entities from unencrypted storage
        const cleanedEntities = unencryptedEntities.filter((entity) => !deletedIds.includes(entity.id));

        if (cleanedEntities.length !== originalCount) {
          await LocalStorage.setItem("authEntities_unencrypted", JSON.stringify(cleanedEntities));
          // console.log(
          //   `DEBUG: 🧹 Cleaned ${originalCount - cleanedEntities.length} deleted entities from unencrypted storage`,
          // );
        } else {
          // console.log("DEBUG: 🔍 No deleted entities found in unencrypted storage");
        }
      } catch (error) {
        console.error("DEBUG: Failed to clean unencrypted storage:", error);
      }
    }
  }

  // [+] Debug method to reset sync state for testing
  async resetSyncState(): Promise<void> {
    // console.log("DEBUG: 🔄 Resetting sync state - clearing entities and timestamp");
    await LocalStorage.removeItem("authEntities");
    await LocalStorage.removeItem("authEntities_unencrypted");
    await LocalStorage.removeItem("lastSyncTime");
    // console.log("DEBUG: ✅ Sync state reset complete - next sync will start from timestamp 0");
  }
}

let storageServiceInstance: StorageService | null = null;
export const getStorageService = (): StorageService => {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
};
