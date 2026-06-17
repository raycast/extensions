/**
 * Encryption utilities for password.link
 * Handles client-side encryption using SJCL-compatible format
 */

import sjcl from "sjcl";
import crypto from "crypto";

/**
 * Generate a random password for encryption
 * @param length - Length of the password (default: 18)
 * @returns Random password string
 */
export function generateRandomPassword(length = 18): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$|/\\!_+,.-?()[]{}<>&#^*=@";
  let result = "";
  const array = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}

/**
 * Create SJCL-compatible ciphertext for password.link
 * @param secret - Secret text to encrypt
 * @param password_part_public - Public part of the password (18 characters)
 * @param password_part_private - Private part of the password (18 characters)
 * @returns Base64 encoded ciphertext
 */
export function createCiphertext(secret: string, password_part_public: string, password_part_private: string): string {
  try {
    // Concatenate private + public parts as shown in the example
    const fullPassword = password_part_private + password_part_public;

    // Encrypt using SJCL with the exact parameters from the example
    const encrypted = sjcl.encrypt(fullPassword, secret, {
      mode: "gcm",
      ks: 256,
      iter: 10000,
    } as unknown as sjcl.SjclCipherEncryptParams);

    // Base64 encode the result
    return btoa(encrypted as unknown as string);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt secret");
  }
}

/**
 * Prepare secret data for API submission
 * @param secret - Secret text to encrypt
 * @returns Object with ciphertext and private password part
 */
export function prepareSecretData(secret: string) {
  // Generate two 18-character password parts
  const password_part_public = generateRandomPassword(18);
  const password_part_private = generateRandomPassword(18);

  // Create the ciphertext
  const ciphertext = createCiphertext(secret, password_part_public, password_part_private);

  const result = {
    ciphertext,
    password_part_private: btoa(password_part_private), // Base64 encode the private part
    publicPart: btoa(password_part_public), // Base64 encode the public part for URL
  };

  return result;
}
