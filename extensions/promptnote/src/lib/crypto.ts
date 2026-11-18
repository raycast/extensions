/**
 * Encryption utilities for PIN-protected notes
 * Uses Node.js crypto module for AES-256-GCM encryption
 * Compatible with the web app's encryption.js
 */

import * as crypto from "crypto";

/**
 * Derive an encryption key from PIN using PBKDF2
 * @param pin - User's PIN
 * @param salt - Base64-encoded salt
 * @returns Derived key as Buffer
 */
export function deriveKey(pin: string, salt: string): Buffer {
  const saltBuffer = Buffer.from(salt, "base64");

  // Use PBKDF2 with same parameters as web app
  // 100k iterations, SHA-256, 256-bit key
  const key = crypto.pbkdf2Sync(pin, saltBuffer, 100000, 32, "sha256");

  return key;
}

/**
 * Hash PIN for verification (not for encryption)
 * @param pin - User's PIN
 * @param salt - Base64-encoded salt
 * @returns Base64-encoded hash
 */
export function hashPin(pin: string, salt: string): string {
  const combined = pin + salt;
  const hash = crypto.createHash("sha256").update(combined).digest();
  return hash.toString("base64");
}

/**
 * Decrypt data using AES-256-GCM
 * @param ciphertext - Base64-encoded ciphertext
 * @param iv - Base64-encoded IV
 * @param key - AES-256 key as Buffer
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, iv: string, key: Buffer): string {
  const ciphertextBuffer = Buffer.from(ciphertext, "base64");
  const ivBuffer = Buffer.from(iv, "base64");

  // AES-256-GCM auth tag is appended to ciphertext (last 16 bytes)
  const authTagLength = 16;
  const encryptedData = ciphertextBuffer.subarray(0, -authTagLength);
  const authTag = ciphertextBuffer.subarray(-authTagLength);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Verify PIN against stored hash
 * @param pin - PIN to verify
 * @param storedHash - Stored hash to compare against
 * @param salt - Salt used for hashing
 * @returns True if PIN matches
 */
export function verifyPinHash(
  pin: string,
  storedHash: string,
  salt: string,
): boolean {
  const computedHash = hashPin(pin, salt);
  return computedHash === storedHash;
}

/**
 * Encrypted content structure (stored in notes.encrypted_content)
 */
export interface EncryptedContent {
  iv: string;
  ciphertext: string;
  snippetIds: string[];
}

/**
 * Decrypted snippet data structure
 */
export interface DecryptedSnippetData {
  id: string;
  title: string;
  content: string;
}

/**
 * Decrypt snippets for a protected note
 * @param encryptedData - Encrypted content from note
 * @param pin - User's PIN
 * @param salt - Base64-encoded salt from user_pin_settings
 * @returns Decrypted snippet data
 */
export function decryptSnippets(
  encryptedData: EncryptedContent,
  pin: string,
  salt: string,
): DecryptedSnippetData[] {
  const key = deriveKey(pin, salt);
  const plaintext = decrypt(encryptedData.ciphertext, encryptedData.iv, key);
  return JSON.parse(plaintext);
}
