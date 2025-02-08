// External dependencies
import { LocalStorage } from "@raycast/api";
import crypto from "crypto";

// Core services
import { ErrorHandler } from "./errorHandler";
import { ErrorCategory, HarmonyError } from "../types/errors";
import { HarmonyHub } from "../types/harmony";
import { Logger } from "./logger";

/**
 * Secure storage implementation for sensitive data.
 * Uses Raycast's LocalStorage with encryption for sensitive data.
 */
export class SecureStorage {
  private static instance: SecureStorage;
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-32-chars-12345678901";
  private readonly ALGORITHM = "aes-256-cbc";
  private readonly errorHandler = new ErrorHandler();

  /**
   * Gets the singleton instance of SecureStorage.
   * @returns {SecureStorage} The singleton instance
   */
  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Stores a value securely.
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise<void>
   * @throws {Error} If storage fails
   *
   * @example
   * ```typescript
   * await secureStorage.set("api_key", "secret_key_123");
   * ```
   */
  public async set(key: string, value: string): Promise<void> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
      let encrypted = cipher.update(value);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      await LocalStorage.setItem(
        key,
        JSON.stringify({
          iv: iv.toString("hex"),
          data: encrypted.toString("hex"),
        }),
      );
      Logger.debug("Stored value in secure storage", { key });
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to store value in secure storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }

  /**
   * Retrieves a value from secure storage.
   *
   * @param key - Storage key
   * @returns Promise<string | null> The stored value or null if not found
   * @throws {Error} If retrieval fails
   *
   * @example
   * ```typescript
   * const value = await secureStorage.get("api_key");
   * ```
   */
  public async get(key: string): Promise<string | null> {
    try {
      const item = await LocalStorage.getItem(key);
      if (!item) return null;

      const parsedItem = JSON.parse(item as string);
      const { iv, data } = parsedItem;
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        Buffer.from(this.ENCRYPTION_KEY),
        Buffer.from(iv, "hex"),
      );
      let decrypted = decipher.update(Buffer.from(data, "hex"));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      Logger.debug("Retrieved value from secure storage", { key });
      return decrypted.toString();
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to retrieve value from secure storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }

  /**
   * Removes a value from secure storage.
   *
   * @param key - Storage key
   * @returns Promise<void>
   * @throws {Error} If removal fails
   *
   * @example
   * ```typescript
   * await secureStorage.remove("api_key");
   * ```
   */
  public async remove(key: string): Promise<void> {
    try {
      await LocalStorage.removeItem(key);
      Logger.debug("Removed value from secure storage", { key });
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to remove value from secure storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }

  /**
   * Clears all values from secure storage.
   *
   * @returns Promise<void>
   * @throws {Error} If clear operation fails
   *
   * @example
   * ```typescript
   * await secureStorage.clear();
   * ```
   */
  public async clear(): Promise<void> {
    try {
      await LocalStorage.clear();
      Logger.debug("Cleared all secure storage");
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to clear secure storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }

  /**
   * Checks if a key exists in secure storage.
   *
   * @param key - Storage key
   * @returns Promise<boolean> True if the key exists
   * @throws {Error} If check fails
   *
   * @example
   * ```typescript
   * const exists = await secureStorage.has("api_key");
   * ```
   */
  public async has(key: string): Promise<boolean> {
    try {
      const item = await LocalStorage.getItem(key);
      Logger.debug("Checked key existence in secure storage", { key, exists: item !== null });
      return item !== null;
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to check key existence in secure storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }

  /**
   * Encrypts a value for storage.
   *
   * @param value - Value to encrypt
   * @returns Encrypted value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(value);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return JSON.stringify({
      iv: iv.toString("hex"),
      data: encrypted.toString("hex"),
    });
  }

  /**
   * Decrypts a stored value.
   *
   * @param value - Value to decrypt
   * @returns Decrypted value
   */
  private decrypt(value: string): string {
    const { iv, data } = JSON.parse(value);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), Buffer.from(iv, "hex"));
    let decrypted = decipher.update(Buffer.from(data, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Retrieves Harmony Hub data from storage.
   *
   * @returns Promise<HarmonyHub | null> The stored Harmony Hub data or null if not found
   * @throws {Error} If retrieval fails
   */
  public static async getHubData(): Promise<HarmonyHub | null> {
    try {
      const hubData = await LocalStorage.getItem<string>("hubData");
      if (!hubData) {
        return null;
      }
      Logger.debug("Retrieved Harmony Hub data from storage");
      return JSON.parse(hubData) as HarmonyHub;
    } catch (error) {
      const harmonyError = new HarmonyError(
        "Failed to retrieve Harmony Hub data from storage",
        ErrorCategory.STORAGE,
        error instanceof Error ? error : undefined,
      );
      ErrorHandler.handle(harmonyError);
      throw harmonyError;
    }
  }
}
