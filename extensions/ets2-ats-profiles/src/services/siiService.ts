import { SIIDecryptor } from "@trucky/sii-decrypt-ts";
import fs from "node:fs";
import path from "node:path";

/**
 * Checks whether a given path points to an existing `.sii` file.
 *
 * @param filePath - Path to check (relative or absolute)
 * @returns true if path exists, is a file, and has `.sii` extension
 */
export function isValidSiiPath(filePath: string): boolean {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return false;
  }

  const resolvedPath: string = path.resolve(filePath);

  if (path.extname(resolvedPath).toLowerCase() !== ".sii") {
    return false;
  }

  try {
    const stats = fs.statSync(resolvedPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if an SII file is already decrypted by reading the header
 *
 * @param filePath - Path to the SII file
 * @returns true if the file is already decrypted
 */
export function isSiiDecrypted(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    return buffer.toString("utf-8", 0, 8) === "SiiNunit";
  } catch {
    return false;
  }
}

/**
 * Checks if an SII file is encrypted by reading the first few bytes
 *
 * @param filePath - Path to the SII file
 * @returns true if the file appears to be encrypted
 */
export function isEncryptedSiiFile(filePath: string): boolean {
  return !isSiiDecrypted(filePath);
}

/**
 * Decrypts an SII file in place using @trucky/sii-decrypt-ts
 *
 * @param filePath - Path to the SII file to decrypt
 */
export async function decryptSii(filePath: string): Promise<void> {
  // Check if already decrypted
  if (isSiiDecrypted(filePath)) {
    return;
  }

  try {
    const result = SIIDecryptor.decrypt(filePath, true);

    if (!result.success) {
      throw new Error(result.error || "Decryption failed");
    }

    // Write the decrypted content back to the original file
    fs.writeFileSync(filePath, result.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Decryption error:", error.message);
      throw new Error(`Failed to decrypt: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Decrypts an encrypted SII file to a new file using @trucky/sii-decrypt-ts
 *
 * @param siiFilePath - Path to the encrypted SII file
 * @param outputPath - Path where the decrypted file should be saved
 * @returns Path to the decrypted file
 */
export async function decryptSiiToFile(siiFilePath: string, outputPath: string): Promise<string> {
  try {
    const result = SIIDecryptor.decrypt(siiFilePath, true);

    if (!result.success) {
      throw new Error(result.error || "Decryption failed");
    }

    // Write the decrypted content to the output file
    fs.writeFileSync(outputPath, result.data);

    // Check if decrypted file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("Decryption failed - output file not created");
    }

    return outputPath;
  } catch (error: unknown) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Converts hex string to regular string
 *
 * @param hex - Hex string to convert
 * @returns Decoded string or null if invalid
 */
export function hexToString(hex: string): string | null {
  hex = hex.startsWith("0x") ? hex.slice(2) : hex;

  // Validate: only hex chars, even length, not empty
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));

  return new TextDecoder().decode(bytes);
}

/**
 * Converts regular string to hex string
 *
 * @param str - String to convert
 * @returns Hex encoded string
 */
export function stringToHex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
