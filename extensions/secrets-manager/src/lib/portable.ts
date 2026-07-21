import { randomBytes, scryptSync } from "node:crypto";
import { encrypt, decrypt, Encrypted } from "./crypto";
import { Store, normalizeStore } from "./types";

const FORMAT = "secmgr-encrypted-v1";

// scrypt cost parameters. N=2^17 is far stronger than Node's default (2^14),
// hardening a portable passphrase-protected file against offline brute force.
// maxmem must be raised to fit N (128 * N * r bytes ≈ 128 MB here).
type Kdf = { N: number; r: number; p: number };
const SCRYPT_PARAMS: Kdf = { N: 2 ** 17, r: 8, p: 1 };
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

// Older exports (before params were embedded) used Node's scrypt defaults.
const LEGACY_KDF: Kdf = { N: 2 ** 14, r: 8, p: 1 };

type EncryptedExport = Encrypted & { format: typeof FORMAT; salt: string; kdf?: Kdf };

function deriveKey(passphrase: string, salt: Buffer, kdf: Kdf): Buffer {
  return scryptSync(passphrase, salt, 32, { ...kdf, maxmem: SCRYPT_MAXMEM });
}

export function exportPlain(store: Store): string {
  return JSON.stringify(store, null, 2);
}

export function exportEncrypted(store: Store, passphrase: string): string {
  const salt = randomBytes(16);
  const key = deriveKey(passphrase, salt, SCRYPT_PARAMS);
  const enc = encrypt(Buffer.from(JSON.stringify(store), "utf8"), key);
  const out: EncryptedExport = { format: FORMAT, salt: salt.toString("base64"), kdf: SCRYPT_PARAMS, ...enc };
  return JSON.stringify(out);
}

export function importData(text: string, passphrase?: string): Store {
  const parsed = JSON.parse(text) as unknown;
  if (isEncryptedExport(parsed)) {
    if (!passphrase) throw new Error("passphrase required");
    const kdf = parsed.kdf ?? LEGACY_KDF;
    const key = deriveKey(passphrase, Buffer.from(parsed.salt, "base64"), kdf);
    const json = decrypt(parsed, key).toString("utf8");
    return normalizeStore(JSON.parse(json));
  }
  return normalizeStore(parsed);
}

function isEncryptedExport(v: unknown): v is EncryptedExport {
  return typeof v === "object" && v !== null && (v as { format?: string }).format === FORMAT;
}
