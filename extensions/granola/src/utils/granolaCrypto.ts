import { promises as fs } from "fs";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { getGranolaConfigPath } from "./granolaConfig";
import { logGranolaError, logGranolaInfo, logGranolaWarn } from "./errorUtils";

const execFileAsync = promisify(execFile);

/**
 * Reads the live Granola session from the *encrypted* on-disk store.
 *
 * Newer Granola desktop versions (v7.x+) no longer keep usable plaintext tokens in
 * `supabase.json` / `stored-accounts.json`; those files go stale while the app rewrites
 * encrypted siblings (`*.enc`) plus a wrapped data-encryption key (`storage.dek`).
 *
 * The scheme mirrors Chromium's `safeStorage` and the proven `tomelliot/obsidian-granola-sync`
 * implementation:
 *   1. `storage.dek` = `v10` prefix + AES-128-CBC(ciphertext), where the wrapping key is
 *      PBKDF2-HMAC-SHA1 of the "Granola Safe Storage" macOS keychain password. The plaintext is
 *      base64 of the 32-byte DEK.
 *   2. Each `<name>.enc` payload is a bare AES-256-GCM blob (12-byte IV + ciphertext + 16-byte
 *      tag) keyed by that DEK, decrypting to the same JSON shape as the plaintext file.
 *
 * Only macOS is supported here (keychain via the `security` CLI). On other platforms these
 * helpers return `undefined` so callers fall back to the plaintext token sources.
 */

const KEYCHAIN_SERVICE = "Granola Safe Storage";
const KEYCHAIN_ACCOUNT = "Granola Key";

const V10_PREFIX = "v10";
const DEK_LENGTH = 32;

// Chromium macOS OSCrypt KDF parameters.
const PBKDF2_SALT = "saltysalt";
const PBKDF2_ITERATIONS = 1003;
const PBKDF2_KEY_LENGTH = 16;
const PBKDF2_DIGEST = "sha1";
const KEYCHAIN_DEK_IV = Buffer.alloc(16, 0x20); // 16 ASCII spaces

// AES-256-GCM on-disk layout for the `.enc` payloads.
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

function stripV10Prefix(blob: Buffer, source: string): Buffer {
  if (blob.subarray(0, V10_PREFIX.length).toString("utf8") !== V10_PREFIX) {
    throw new Error(`${source} does not start with the ${V10_PREFIX} prefix`);
  }
  return blob.subarray(V10_PREFIX.length);
}

/**
 * Reads the "Granola Safe Storage" password from the macOS keychain via the `security` CLI.
 * Triggers a one-time OS prompt the first time. Returns `undefined` on any failure (non-macOS,
 * missing item, denied prompt) so callers can fall through gracefully.
 */
export async function getKeychainPassword(): Promise<string | undefined> {
  if (process.platform !== "darwin") {
    return undefined;
  }
  try {
    const { stdout, stderr } = await execFileAsync("security", [
      "find-generic-password",
      "-w",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      KEYCHAIN_ACCOUNT,
    ]);
    const password = stdout.replace(/\n$/, "");
    if (password.length > 0) {
      logGranolaInfo("getKeychainPassword", { found: true, passwordLength: password.length });
      return password;
    }
    logGranolaWarn("getKeychainPassword", { found: false, stderr: stderr?.trim().slice(0, 100) });
    return undefined;
  } catch (error) {
    logGranolaError("getKeychainPassword", error);
    return undefined;
  }
}

/**
 * Unwraps `storage.dek` into the 32-byte data-encryption key. Returns `undefined` if the key
 * material is unavailable or cannot be decrypted.
 */
export async function loadDek(): Promise<Buffer | undefined> {
  const password = await getKeychainPassword();
  if (!password) {
    return undefined;
  }

  try {
    const dekBlob = await fs.readFile(getGranolaConfigPath("storage.dek"));
    const wrappingKey = crypto.pbkdf2Sync(
      password,
      PBKDF2_SALT,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_DIGEST,
    );
    const decipher = crypto.createDecipheriv("aes-128-cbc", wrappingKey, KEYCHAIN_DEK_IV);
    const plaintext = Buffer.concat([decipher.update(stripV10Prefix(dekBlob, "storage.dek")), decipher.final()]);
    const dek = Buffer.from(plaintext.toString("utf8"), "base64");
    if (dek.length !== DEK_LENGTH) {
      throw new Error(`Expected a ${DEK_LENGTH}-byte DEK, got ${dek.length}`);
    }
    return dek;
  } catch (error) {
    logGranolaError("loadDek", error);
    return undefined;
  }
}

function decryptGcmPayload(dek: Buffer, blob: Buffer): Buffer {
  if (blob.length < GCM_IV_LENGTH + GCM_TAG_LENGTH) {
    throw new Error("Encrypted payload is too short to contain an IV and auth tag");
  }
  const iv = blob.subarray(0, GCM_IV_LENGTH);
  const tag = blob.subarray(blob.length - GCM_TAG_LENGTH);
  const ciphertext = blob.subarray(GCM_IV_LENGTH, blob.length - GCM_TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Decrypts a Granola encrypted config file (e.g. `supabase.json` -> reads `supabase.json.enc`)
 * and returns the parsed JSON object, or `undefined` if it cannot be read/decrypted.
 *
 * An optional pre-resolved `dek` avoids re-reading the keychain when decrypting several files.
 */
export async function decryptGranolaFile(
  filename: string,
  dek?: Buffer,
): Promise<Record<string, unknown> | undefined> {
  try {
    const key = dek ?? (await loadDek());
    if (!key) {
      return undefined;
    }
    const blob = await fs.readFile(getGranolaConfigPath(`${filename}.enc`));
    const json = decryptGcmPayload(key, blob).toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    logGranolaInfo("decryptGranolaFile", { filename, keys: Object.keys(parsed) });
    return parsed;
  } catch (error) {
    logGranolaError("decryptGranolaFile", error, { filename });
    return undefined;
  }
}
