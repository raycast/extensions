import { createDecipheriv } from "crypto";

const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const AAD = Buffer.from("entrycontent");

export function validateAndParseKey(input: string): Buffer | null {
  const trimmed = input.trim();

  // Try hex format (64 characters = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  // Try base64 format (44 characters with padding = 32 bytes)
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed) || /^[A-Za-z0-9+/]{44}$/.test(trimmed)) {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  }

  // Try base64 without strict length check (for flexibility)
  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Not valid base64
  }

  return null;
}

export function decryptEntry(encryptedData: Buffer, key: Buffer): Buffer {
  if (encryptedData.length < NONCE_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted data too short");
  }

  const nonce = encryptedData.subarray(0, NONCE_LENGTH);
  const ciphertextWithTag = encryptedData.subarray(NONCE_LENGTH);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - AUTH_TAG_LENGTH);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(AAD);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted;
}
