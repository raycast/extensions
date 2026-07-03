import { type CipherGCMTypes, createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** How the encrypted payload is represented as text in the form. */
export type Encoding = "base64" | "hex";

/** AES key size in bits. */
export type KeyLength = 128 | 192 | 256;

/** Hash used to derive the AES key from the password. */
export type KeyAlgorithm = "sha256" | "sha512" | "sha1" | "md5";

/**
 * Block-cipher mode. The two are NOT interoperable — a payload encrypted in one
 * mode cannot be decrypted in the other.
 * - `ctr`: legacy/compatible. Raw stream cipher, 16-byte IV, no auth tag, payload
 *   `[iv(16) | ciphertext]`. No integrity check: a wrong password yields garbage
 *   rather than an error.
 * - `gcm`: authenticated. 12-byte nonce + 16-byte tag, payload
 *   `[iv(12) | ciphertext | tag(16)]`. A wrong password or tampered input fails
 *   loudly instead of returning garbage.
 */
export type CipherMode = "ctr" | "gcm";

export type AesOptions = {
  mode: CipherMode;
  encoding: Encoding;
  keyLength: KeyLength;
  algorithm: KeyAlgorithm;
};

const GCM_IV_LENGTH = 12;
const CTR_IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derive an AES key of `keyLength` bits from a password by hashing it with the
 * chosen algorithm. When a single digest is shorter than the requested key, more
 * blocks are chained (OpenSSL `EVP_BytesToKey`-style, without salt) so any
 * algorithm/length combination produces enough material deterministically. For
 * the common SHA-256 + 256-bit case this is exactly `sha256(password)`.
 */
export function deriveKey(password: string, algorithm: KeyAlgorithm, keyLength: KeyLength): Buffer {
  const byteLength = keyLength / 8;
  const passwordBytes = Buffer.from(password, "utf8");
  const blocks: Buffer[] = [];
  let produced = 0;
  let previous = Buffer.alloc(0);
  while (produced < byteLength) {
    previous = createHash(algorithm).update(previous).update(passwordBytes).digest();
    blocks.push(previous);
    produced += previous.length;
  }
  return Buffer.concat(blocks).subarray(0, byteLength);
}

/** Format a key as space-separated uppercase hex pairs, e.g. `9F 86 D0 81`. */
export function formatKey(key: Buffer): string {
  return (key.toString("hex").toUpperCase().match(/.{2}/g) ?? []).join(" ");
}

function gcmCipherName(keyLength: KeyLength): CipherGCMTypes {
  return `aes-${keyLength}-gcm`;
}

function ctrCipherName(keyLength: KeyLength): string {
  return `aes-${keyLength}-ctr`;
}

export function encryptBytes(data: Buffer, password: string, options: AesOptions): Buffer {
  const key = deriveKey(password, options.algorithm, options.keyLength);
  if (options.mode === "gcm") {
    const iv = randomBytes(GCM_IV_LENGTH);
    const cipher = createCipheriv(gcmCipherName(options.keyLength), key, iv);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]);
  }
  const iv = randomBytes(CTR_IV_LENGTH);
  const cipher = createCipheriv(ctrCipherName(options.keyLength), key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, ciphertext]);
}

export function decryptBytes(payload: Buffer, password: string, options: AesOptions): Buffer {
  const key = deriveKey(password, options.algorithm, options.keyLength);
  if (options.mode === "gcm") {
    if (payload.length < GCM_IV_LENGTH + TAG_LENGTH) {
      throw new Error(
        `Input is too short for GCM — it must be at least ${GCM_IV_LENGTH + TAG_LENGTH} bytes ` +
          `(${GCM_IV_LENGTH}-byte IV + ${TAG_LENGTH}-byte tag), but is ${payload.length}.`,
      );
    }
    const iv = payload.subarray(0, GCM_IV_LENGTH);
    const tag = payload.subarray(payload.length - TAG_LENGTH);
    const ciphertext = payload.subarray(GCM_IV_LENGTH, payload.length - TAG_LENGTH);
    const decipher = createDecipheriv(gcmCipherName(options.keyLength), key, iv);
    decipher.setAuthTag(tag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      // GCM's only runtime failure here is the tag check.
      throw new Error(
        "Authentication tag check failed — wrong password, key length, or algorithm, or the data was modified.",
      );
    }
  }
  if (payload.length < CTR_IV_LENGTH) {
    throw new Error(
      `Input is too short for CTR — it must be at least ${CTR_IV_LENGTH} bytes (the IV), but is ${payload.length}.`,
    );
  }
  const iv = payload.subarray(0, CTR_IV_LENGTH);
  const ciphertext = payload.subarray(CTR_IV_LENGTH);
  const decipher = createDecipheriv(ctrCipherName(options.keyLength), key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Decode an encrypted payload from its text encoding, rejecting malformed input.
 * `Buffer.from` silently drops invalid characters, so a wrong/garbled encoding
 * would otherwise surface only as a confusing "too short" or tag error — this
 * pinpoints the encoding itself instead.
 */
function decodePayload(encoded: string, encoding: Encoding): Buffer {
  const compact = encoded.replace(/\s+/g, "");
  if (encoding === "hex") {
    if (!/^[0-9a-fA-F]*$/.test(compact) || compact.length % 2 !== 0) {
      throw new Error("Input is not valid Hex — expected an even number of 0-9/a-f characters.");
    }
    return Buffer.from(compact, "hex");
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error("Input is not valid Base 64 — it contains characters outside the Base 64 alphabet.");
  }
  const decoded = Buffer.from(compact, "base64");
  // Re-encoding canonicalizes, so a mismatch means the input was not real Base 64.
  if (decoded.toString("base64").replace(/=+$/, "") !== compact.replace(/=+$/, "")) {
    throw new Error("Input is not valid Base 64.");
  }
  return decoded;
}

/** True if `buf` is a lossless UTF-8 round-trip (i.e. valid UTF-8 text). */
function isValidUtf8(buf: Buffer): boolean {
  return Buffer.from(buf.toString("utf8"), "utf8").equals(buf);
}

/** Encrypt UTF-8 text, returning the payload in the chosen text encoding. */
export function encryptText(text: string, password: string, options: AesOptions): string {
  return encryptBytes(Buffer.from(text, "utf8"), password, options).toString(options.encoding);
}

/** Decrypt a payload (in the chosen text encoding) back to UTF-8 text. */
export function decryptText(encoded: string, password: string, options: AesOptions): string {
  const plaintext = decryptBytes(decodePayload(encoded, options.encoding), password, options);
  // CTR has no integrity check, so a wrong password "succeeds" and yields garbage.
  // If that garbage isn't valid text, surface a hint (GCM would already have thrown).
  if (options.mode === "ctr" && !isValidUtf8(plaintext)) {
    throw new Error(
      "Decrypted data is not valid text — likely a wrong password, key length, or algorithm (CTR cannot verify this).",
    );
  }
  return plaintext.toString("utf8");
}
