import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { EncryptedVault, Vault } from "./types";

const KDF = { algo: "scrypt" as const, N: 16384, r: 8, p: 1 };
const KEY_LEN = 32;

export function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return scryptSync(masterPassword, salt, KEY_LEN, { N: KDF.N, r: KDF.r, p: KDF.p, maxmem: 64 * 1024 * 1024 });
}

export function encryptVault(vault: Vault, masterPassword: string): EncryptedVault {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(masterPassword, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(vault);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    v: vault.version,
    kdf: { ...KDF, salt: salt.toString("hex") },
    cipher: { algo: "aes-256-gcm", iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") },
    data: encrypted.toString("base64"),
  };
}

export function decryptVault(enc: EncryptedVault, masterPassword: string): Vault {
  const salt = Buffer.from(enc.kdf.salt, "hex");
  const key = deriveKey(masterPassword, salt);
  const iv = Buffer.from(enc.cipher.iv, "hex");
  const tag = Buffer.from(enc.cipher.tag, "hex");
  const decipher = createDecipheriv(enc.cipher.algo, key, iv);
  decipher.setAuthTag(tag);
  try {
    const decrypted = Buffer.concat([decipher.update(Buffer.from(enc.data, "base64")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as Vault;
  } catch {
    throw new Error("WRONG_PASSWORD");
  }
}

/** Verify a master password without full decryption — cheap GCM tag check. */
export function verifyPassword(enc: EncryptedVault, masterPassword: string): boolean {
  try {
    decryptVault(enc, masterPassword);
    return true;
  } catch {
    return false;
  }
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
