/**
 * Encryption utilities for securing cached data
 * Uses AES-256-GCM encryption with a key derived from system information
 */

import * as crypto from "crypto";
import * as os from "os";
import * as fs from "fs";

/**
 * Derive an encryption key from system-specific information
 * This ensures the key is unique to the user's machine
 */
function deriveEncryptionKey(): Buffer {
  // Use a combination of system information to create a unique key
  // This ensures the encrypted cache can only be decrypted on this machine
  const systemInfo = [os.hostname(), os.userInfo().username, os.platform(), os.arch()].join("|");

  // Use PBKDF2 to derive a 32-byte key (256 bits) for AES-256
  const salt = "nordpass-raycast-extension-v1"; // Fixed salt for consistency
  return crypto.pbkdf2Sync(systemInfo, salt, 100000, 32, "sha256");
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string): string {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(16); // Initialization vector

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV, auth tag, and encrypted data
  return JSON.stringify({
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encrypted: encrypted,
  });
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = deriveEncryptionKey();
    const data = JSON.parse(encryptedData);

    const iv = Buffer.from(data.iv, "hex");
    const authTag = Buffer.from(data.authTag, "hex");
    const encrypted = data.encrypted;

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    // If decryption fails, the data might be unencrypted (backward compatibility)
    // or the key derivation changed (e.g., system info changed)
    throw new Error("Failed to decrypt cache. The cache may be corrupted or from a different system.");
  }
}

/**
 * Check if a string is encrypted (starts with JSON structure)
 */
function isEncrypted(data: string): boolean {
  try {
    const parsed = JSON.parse(data);
    return parsed.iv && parsed.authTag && parsed.encrypted;
  } catch {
    return false;
  }
}

/**
 * Set restrictive file permissions (read/write for owner only)
 */
export function setSecureFilePermissions(filePath: string): void {
  try {
    // Set permissions to 600 (rw-------): owner read/write, no access for others
    fs.chmodSync(filePath, 0o600);
  } catch (error) {
    // If setting permissions fails, log but don't throw (some systems may not support it)
    console.warn("Could not set file permissions:", error);
  }
}

/**
 * Read encrypted or plain text file (for backward compatibility)
 */
export function readSecureFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");

  // Check if content is encrypted
  if (isEncrypted(content)) {
    return decryptData(content);
  }

  // Return plain text (for backward compatibility with unencrypted cache)
  return content;
}

/**
 * Write encrypted file with secure permissions
 */
export function writeSecureFile(filePath: string, data: string, encrypt: boolean = true): void {
  const content = encrypt ? encryptData(data) : data;

  fs.writeFileSync(filePath, content, "utf-8");

  // Set restrictive permissions
  setSecureFilePermissions(filePath);
}
