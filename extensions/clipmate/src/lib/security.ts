/**
 * Security utilities for Raycast extension
 * Provides encryption/decryption and secure storage for sensitive data like API keys
 * Uses Node.js crypto APIs instead of Web Crypto API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { LocalStorage } from "@raycast/api";
import * as crypto from "crypto";

/**
 * Decrypt API key data from server using Node.js crypto (AES-CBC)
 * Note: This function handles server-encrypted data which uses CBC mode
 */
export async function decryptApiKey(encryptedData: string, passphrase: string): Promise<string> {
  try {
    // Convert from base64
    const combined = Buffer.from(encryptedData, "base64");

    // Extract salt, IV, and encrypted data (CBC format from server)
    const salt = combined.subarray(0, 16);
    const iv = combined.subarray(16, 32); // 16 bytes for CBC
    const encrypted = combined.subarray(32);

    // Derive key from passphrase using PBKDF2
    const key = crypto.pbkdf2Sync(passphrase, salt as any, 100000, 32, "sha256");

    // Decrypt the data using AES-256-CBC (server format)
    const decipher = crypto.createDecipheriv("aes-256-cbc", key as any, iv as any);
    let decrypted = decipher.update(encrypted as any, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Simple encryption using Node.js crypto for local storage
 */
class SecurityManager {
  private static instance: SecurityManager;
  private encryptionKey: Buffer | null = null;

  private constructor() {}

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Generate or retrieve encryption key for local storage
   */
  private async getEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      // Try to get existing key from Raycast LocalStorage
      const storedKey = await LocalStorage.getItem("_clipmate_enc_key");

      if (storedKey && typeof storedKey === "string") {
        // Import existing key
        this.encryptionKey = Buffer.from(storedKey, "hex");
      } else {
        // Generate new key
        this.encryptionKey = crypto.randomBytes(32); // 256-bit key

        // Store the key
        await LocalStorage.setItem("_clipmate_enc_key", this.encryptionKey.toString("hex"));
      }

      return this.encryptionKey;
    } catch (error) {
      console.error("Error setting up encryption key:", error);
      throw new Error("Failed to initialize encryption");
    }
  }

  /**
   * Encrypt sensitive data for local storage
   */
  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.randomBytes(12); // 12 bytes for GCM

      const cipher = crypto.createCipheriv("aes-256-gcm", key as any, iv as any);
      const encrypted = Buffer.concat([cipher.update(data, "utf8") as any, cipher.final() as any]);
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      const combined = Buffer.concat([iv as any, authTag as any, encrypted as any]);

      // Convert to base64 for storage
      return combined.toString("base64");
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt sensitive data from local storage
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const combined = Buffer.from(encryptedData, "base64");

      // Extract IV, auth tag, and encrypted data
      const iv = combined.subarray(0, 12); // 12 bytes for GCM
      const authTag = combined.subarray(12, 28); // 16 bytes for auth tag
      const encrypted = combined.subarray(28);

      const decipher = crypto.createDecipheriv("aes-256-gcm", key as any, iv as any);
      decipher.setAuthTag(authTag as any);
      let decrypted = decipher.update(encrypted as any, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Clear encryption key (for logout)
   */
  async clearKey(): Promise<void> {
    this.encryptionKey = null;
    await LocalStorage.removeItem("_clipmate_enc_key");
  }
}

/**
 * Secure storage wrapper for sensitive data in Raycast
 */
export class SecureStorage {
  private security = SecurityManager.getInstance();

  /**
   * Store encrypted sensitive data
   */
  async setSecure(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.security.encrypt(value);
      await LocalStorage.setItem(`_clipmate_secure_${key}`, encrypted);
    } catch (error) {
      console.error(`Failed to store secure data for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  async getSecure(key: string): Promise<string | null> {
    try {
      const encryptedData = await LocalStorage.getItem(`_clipmate_secure_${key}`);
      if (!encryptedData || typeof encryptedData !== "string") {
        return null;
      }
      return await this.security.decrypt(encryptedData);
    } catch (error) {
      console.error(`Failed to retrieve secure data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data
   */
  async removeSecure(key: string): Promise<void> {
    await LocalStorage.removeItem(`_clipmate_secure_${key}`);
  }

  /**
   * Clear all sensitive data and encryption keys
   */
  async clearAll(): Promise<void> {
    await this.security.clearKey();
    // Remove all secure storage data
    const allItems = await LocalStorage.allItems();
    const secureKeys = Object.keys(allItems).filter((key) => key.startsWith("_clipmate_secure_"));

    for (const key of secureKeys) {
      await LocalStorage.removeItem(key);
    }
  }
}

// Export instances for use throughout the app
export const secureStorage = new SecureStorage();
