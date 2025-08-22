// src/services/storage.ts
import { LocalStorage } from "@raycast/api";
import { AuthData, AuthKey, UserCredentials, AuthenticationContext } from "../types";
import { bufToBase64, base64ToBuf } from "./crypto";
import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const STORAGE_SALT = "ente-raycast-local-storage-salt";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export class StorageService {
  private masterKey: Buffer | null = null; // [+] Use Buffer type
  private storageEncryptionKey: Buffer | null = null;

  private async getStorageEncryptionKey(): Promise<Buffer> {
    if (this.storageEncryptionKey) {
      return this.storageEncryptionKey;
    }

    const masterKey = await this.getMasterKey();
    if (!masterKey) throw new Error("Master key is not set. Cannot derive storage key.");

    this.storageEncryptionKey = pbkdf2Sync(masterKey, STORAGE_SALT, 100000, 32, "sha256");
    console.log("DEBUG: Derived local storage encryption key.");
    return this.storageEncryptionKey;
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

  async getMasterKey(): Promise<Buffer | null> {
    // [+] Use Buffer type
    if (this.masterKey) return this.masterKey;
    const creds = await this.getCredentials();
    return creds ? creds.masterKey : null;
  }

  setMasterKey(key: Buffer) {
    // [+] Use Buffer type
    this.masterKey = key;
  }

  async storeCredentials(credentials: UserCredentials): Promise<void> {
    this.masterKey = credentials.masterKey;
    console.log("DEBUG: Master key set in memory for StorageService.");

    const storableCredentials = {
      ...credentials,
      masterKey: bufToBase64(credentials.masterKey), // Convert Buffer to Base64 for JSON
    };

    const encrypted = await this.encryptData(JSON.stringify(storableCredentials));
    await LocalStorage.setItem("credentials", encrypted);

    // [PERSISTENCE FIX] Store session token separately for direct reuse on startup
    await LocalStorage.setItem("sessionToken", credentials.token);
    console.log("DEBUG: Credentials and session token stored for persistence.");
  }

  async getCredentials(): Promise<UserCredentials | null> {
    const encryptedData = (await LocalStorage.getItem("credentials")) as string | undefined;
    if (!encryptedData) {
      console.log("DEBUG: No encrypted credentials found in storage");
      return null;
    }

    try {
      if (!this.masterKey) {
        console.warn("DEBUG: Master key not in memory. Attempting session token restoration instead of clearing.");
        // Don't clear credentials immediately - try session token restoration first
        return null;
      }

      const decrypted = await this.decryptData(encryptedData);
      const storedCreds = JSON.parse(decrypted);

      const credentials: UserCredentials = {
        ...storedCreds,
        masterKey: base64ToBuf(storedCreds.masterKey), // Convert Base64 back to Buffer
      };

      this.masterKey = credentials.masterKey;
      return credentials;
    } catch (error) {
      console.error("Failed to decrypt credentials:", error);
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

  async storeAuthEntities(entities: AuthData[]): Promise<void> {
    console.log(`DEBUG: 💾 Storing ${entities.length} auth entities (SIMPLIFIED)`);

    try {
      // FUNDAMENTAL FIX: Always clear both storage locations first to prevent stale data
      await LocalStorage.removeItem("authEntities");
      await LocalStorage.removeItem("authEntities_unencrypted");
      console.log("DEBUG: 🧹 Cleared both storage locations to prevent stale deletions");

      const encrypted = await this.encryptData(JSON.stringify(entities));
      await LocalStorage.setItem("authEntities", encrypted);
      console.log("DEBUG: ✅ Auth entities stored (encrypted, single source of truth)");
    } catch {
      // If encryption fails (e.g., during session restoration without master key),
      // store unencrypted as fallback, but still clear both locations first
      console.log("DEBUG: 🔄 Encryption failed, storing auth entities unencrypted (session restoration)");
      await LocalStorage.setItem("authEntities_unencrypted", JSON.stringify(entities));
      console.log("DEBUG: ✅ Auth entities stored (unencrypted fallback, but clean)");
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
        console.log(`DEBUG: ✅ Retrieved ${encryptedEntities.length} auth entities (encrypted)`);
      } catch {
        console.log("DEBUG: ⚠️ Failed to decrypt auth entities, trying unencrypted fallback");
      }
    }

    // Check unencrypted version (used during session restoration)
    const unencryptedData = (await LocalStorage.getItem("authEntities_unencrypted")) as string | undefined;
    if (unencryptedData) {
      try {
        unencryptedEntities = JSON.parse(unencryptedData);
        console.log(`DEBUG: 📋 Found ${unencryptedEntities.length} auth entities (unencrypted fallback)`);
      } catch (error) {
        console.error("Failed to parse unencrypted auth entities:", error);
      }
    }

    // DELETION FIX: Choose the most recent/complete data source
    if (useEncrypted && encryptedEntities.length > 0) {
      // Prefer encrypted data when available
      if (unencryptedEntities.length > 0) {
        console.log("DEBUG: 🔍 Both encrypted and unencrypted entities found, using encrypted (more recent)");
      }
      return encryptedEntities;
    } else if (unencryptedEntities.length > 0) {
      console.log("DEBUG: ✅ Using unencrypted fallback entities");
      return unencryptedEntities;
    }

    console.log("DEBUG: ❌ No auth entities found");
    return [];
  }

  async storeLastSyncTime(time: number): Promise<void> {
    await LocalStorage.setItem("lastSyncTime", time.toString());
  }

  async getLastSyncTime(): Promise<number> {
    const time = (await LocalStorage.getItem("lastSyncTime")) as string | undefined;
    return time ? parseInt(time, 10) : 0;
  }

  async storeAuthenticationContext(context: AuthenticationContext): Promise<void> {
    console.log("DEBUG: Storing authentication context", {
      userId: context.userId,
      accountKey: context.accountKey ? context.accountKey.substring(0, 20) + "..." : "none",
      userAgent: context.userAgent,
    });

    try {
      const encrypted = await this.encryptData(JSON.stringify(context));
      await LocalStorage.setItem("authenticationContext", encrypted);
      console.log("DEBUG: ✅ Authentication context stored (encrypted)");
    } catch {
      // If encryption fails (e.g., during session restoration without master key),
      // store unencrypted since authentication context is not sensitive
      console.log("DEBUG: 🔄 Encryption failed, storing authentication context unencrypted (session restoration)");
      await LocalStorage.setItem("authenticationContext_unencrypted", JSON.stringify(context));
      console.log("DEBUG: ✅ Authentication context stored (unencrypted fallback)");
    }
  }

  async getAuthenticationContext(): Promise<AuthenticationContext | null> {
    // First try encrypted version
    const encryptedData = (await LocalStorage.getItem("authenticationContext")) as string | undefined;
    if (encryptedData) {
      try {
        const decrypted = await this.decryptData(encryptedData);
        console.log("DEBUG: ✅ Retrieved authentication context (encrypted)");
        return JSON.parse(decrypted);
      } catch {
        console.log("DEBUG: ⚠️ Failed to decrypt authentication context, trying unencrypted fallback");
      }
    }

    // Fallback to unencrypted version (used during session restoration)
    const unencryptedData = (await LocalStorage.getItem("authenticationContext_unencrypted")) as string | undefined;
    if (unencryptedData) {
      try {
        console.log("DEBUG: ✅ Retrieved authentication context (unencrypted fallback)");
        return JSON.parse(unencryptedData);
      } catch (error) {
        console.error("Failed to parse unencrypted authentication context:", error);
      }
    }

    console.log("DEBUG: ❌ No authentication context found");
    return null;
  }

  // [+] Add token lifecycle management methods matching web app
  async storeEncryptedToken(userId: number, encryptedToken: string): Promise<void> {
    console.log("DEBUG: Storing encrypted token for later decryption (web app pattern)");
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

  // [PERSISTENCE FIX] Session token management for cross-restart persistence
  async storeSessionToken(token: string, email: string, userId: number): Promise<void> {
    console.log("DEBUG: 💾 Storing session token for persistence across restarts");
    console.log("DEBUG: Token length:", token.length);
    console.log("DEBUG: Token preview:", token.substring(0, 20) + "...");

    const sessionData = {
      token,
      email,
      userId,
      timestamp: Date.now(),
      userAgent: "Raycast/Ente-Auth/1.0.0",
    };

    // Store session data without encryption since it's already a derived session token
    await LocalStorage.setItem("persistentSession", JSON.stringify(sessionData));
    console.log("DEBUG: ✅ Session token stored for persistence");
  }

  async getStoredSessionToken(): Promise<{ token: string; email: string; userId: number; userAgent: string } | null> {
    try {
      const sessionData = (await LocalStorage.getItem("persistentSession")) as string | undefined;
      if (!sessionData) {
        console.log("DEBUG: No persistent session found");
        return null;
      }

      const parsed = JSON.parse(sessionData);
      console.log("DEBUG: 🔍 Found stored session for user:", parsed.userId);
      console.log("DEBUG: Session age:", Math.floor((Date.now() - parsed.timestamp) / 1000 / 60), "minutes");

      return {
        token: parsed.token,
        email: parsed.email,
        userId: parsed.userId,
        userAgent: parsed.userAgent || "Raycast/Ente-Auth/1.0.0",
      };
    } catch (error) {
      console.error("DEBUG: Failed to parse stored session:", error);
      return null;
    }
  }

  async clearStoredSessionToken(): Promise<void> {
    await LocalStorage.removeItem("persistentSession");
    console.log("DEBUG: 🗑️ Cleared stored session token");
  }

  // Legacy method for backward compatibility
  async activateToken(token: string): Promise<void> {
    console.log("DEBUG: Activating token for API access (legacy method)");
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
    console.log("DEBUG: 🧹 Clearing all stored data and resetting service state");
    this.masterKey = null;
    this.storageEncryptionKey = null;
    await LocalStorage.clear();
    console.log("DEBUG: ✅ All data cleared and service reset");
  }

  // [PERSISTENCE FIX] Authenticator key persistence for session restoration
  async storeDecryptedAuthKey(authKey: Buffer): Promise<void> {
    console.log("DEBUG: 💾 Storing decrypted authenticator key for session restoration");
    const keyData = {
      key: bufToBase64(authKey),
      timestamp: Date.now(),
    };

    // Store without encryption since we're avoiding master key dependency
    await LocalStorage.setItem("decryptedAuthKey", JSON.stringify(keyData));
    console.log("DEBUG: ✅ Decrypted authenticator key stored for session restoration");
  }

  async getStoredDecryptedAuthKey(): Promise<Buffer | null> {
    try {
      const keyData = (await LocalStorage.getItem("decryptedAuthKey")) as string | undefined;
      if (!keyData) {
        console.log("DEBUG: No stored decrypted authenticator key found");
        return null;
      }

      const parsed = JSON.parse(keyData);
      console.log("DEBUG: 🔑 Found stored decrypted authenticator key");
      console.log("DEBUG: Key age:", Math.floor((Date.now() - parsed.timestamp) / 1000 / 60), "minutes");

      return base64ToBuf(parsed.key);
    } catch (error) {
      console.error("DEBUG: Failed to parse stored decrypted authenticator key:", error);
      return null;
    }
  }

  async clearStoredDecryptedAuthKey(): Promise<void> {
    await LocalStorage.removeItem("decryptedAuthKey");
    console.log("DEBUG: 🗑️ Cleared stored decrypted authenticator key");
  }

  // [PERSISTENCE FIX] Clean up failed session restoration attempts
  async cleanupFailedSessionRestoration(): Promise<void> {
    console.log("DEBUG: 🧹 Cleaning up failed session restoration data");
    await LocalStorage.removeItem("authenticationContext_unencrypted");
    await LocalStorage.removeItem("authEntities_unencrypted");
    await LocalStorage.removeItem("decryptedAuthKey");
    console.log("DEBUG: ✅ Cleaned up unencrypted authentication context, auth entities, and decrypted auth key");
  }

  // DELETION FIX: Consistent entity update that handles both storage locations
  async updateAuthEntitiesFromSync(
    currentEntities: Map<string, AuthData>,
    entityChanges: Array<{ id: string; isDeleted: boolean; entityData?: AuthData }>,
  ): Promise<AuthData[]> {
    console.log(`DEBUG: 🔄 Processing ${entityChanges.length} entity changes for consistent storage`);

    let deletionCount = 0;
    let updateCount = 0;

    // Apply all changes to the entity map
    for (const change of entityChanges) {
      if (change.isDeleted) {
        const wasDeleted = currentEntities.delete(change.id);
        console.log(`DEBUG: ❌ ${wasDeleted ? "Deleted" : "Already missing"} entity ${change.id}`);
        if (wasDeleted) deletionCount++;
      } else if (change.entityData) {
        currentEntities.set(change.id, change.entityData);
        console.log(`DEBUG: ✅ Updated entity ${change.id}`);
        updateCount++;
      }
    }

    const updatedEntities = Array.from(currentEntities.values());
    console.log(
      `DEBUG: 📊 Applied ${deletionCount} deletions and ${updateCount} updates. Final count: ${updatedEntities.length}`,
    );

    // CRITICAL FIX: Force store to unencrypted during session restoration when no master key
    const masterKey = await this.getMasterKey();
    if (!masterKey) {
      console.log(
        `DEBUG: 🔄 No master key available - forcing unencrypted storage for ${updatedEntities.length} entities`,
      );
      await LocalStorage.setItem("authEntities_unencrypted", JSON.stringify(updatedEntities));
      console.log(`DEBUG: ✅ Forced unencrypted storage update with deletions applied`);
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
    console.log(`DEBUG: 🧹 Ensuring ${deletedIds.length} deletions are reflected in all storage locations`);

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
          console.log(
            `DEBUG: 🧹 Cleaned ${originalCount - cleanedEntities.length} deleted entities from unencrypted storage`,
          );
        } else {
          console.log("DEBUG: 🔍 No deleted entities found in unencrypted storage");
        }
      } catch (error) {
        console.error("DEBUG: Failed to clean unencrypted storage:", error);
      }
    }
  }

  // [+] Debug method to reset sync state for testing
  async resetSyncState(): Promise<void> {
    console.log("DEBUG: 🔄 Resetting sync state - clearing entities and timestamp");
    await LocalStorage.removeItem("authEntities");
    await LocalStorage.removeItem("authEntities_unencrypted");
    await LocalStorage.removeItem("lastSyncTime");
    console.log("DEBUG: ✅ Sync state reset complete - next sync will start from timestamp 0");
  }
}

let storageServiceInstance: StorageService | null = null;
export const getStorageService = (): StorageService => {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
  }
  return storageServiceInstance;
};
