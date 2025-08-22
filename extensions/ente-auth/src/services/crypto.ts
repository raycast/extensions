// src/services/crypto.ts
import { hash } from "argon2-wasm";
import sodium from "libsodium-wrappers-sumo";

// --- Debugging Helpers ---
const logBuffer = (name: string, buf: Buffer | Uint8Array | undefined | string, showContent = false) => {
  if (buf === undefined || buf === null) {
    console.log(`DEBUG: ${name} is undefined or null.`);
    return;
  }
  if (typeof buf === "string") {
    console.log(`DEBUG: ${name} (string: "${buf}")`);
    return;
  }
  const length = buf.length;
  const content = showContent ? `(content: ${Buffer.from(buf).toString("base64")})` : "";
  console.log(`DEBUG: ${name} (length: ${length}, type: ${buf.constructor.name}) ${content}`);
};

// --- Crypto Helpers ---
export function base64ToBuf(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

export function bufToBase64(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}

/**
 * Convert bytes to base64 - matches web implementation toB64 function
 */
const toB64 = async (input: Uint8Array): Promise<string> => {
  await sodium.ready;
  return sodium.to_base64(input, sodium.base64_variants.ORIGINAL);
};

/**
 * Convert base64 to bytes - matches web implementation fromB64 function
 */
const fromB64 = async (input: string): Promise<Uint8Array> => {
  await sodium.ready;
  return sodium.from_base64(input, sodium.base64_variants.ORIGINAL);
};

/**
 * Convert BytesOrB64 to bytes - matches web implementation
 */
const bytes = async (bob: string | Uint8Array): Promise<Uint8Array> => (typeof bob == "string" ? fromB64(bob) : bob);

// --- LOGIN CRYPTOGRAPHIC CHAIN ---

export async function deriveKeyEncryptionKey(
  password: string,
  saltB64: string,
  memLimit: number,
  opsLimit: number,
): Promise<Buffer> {
  console.log("DEBUG: --- [Step 1] Starting Key Encryption Key (KEK) Derivation ---");
  const passwordBuf = Buffer.from(password, "utf-8");
  const saltBuf = base64ToBuf(saltB64);
  logBuffer("Password String", password);
  logBuffer("Password Buffer", passwordBuf);
  logBuffer("Salt Buffer", saltBuf, true);
  console.log(`DEBUG: Argon2 Params -> memLimit (KiB): ${memLimit / 1024}, opsLimit (iterations): ${opsLimit}`);
  try {
    const result = await hash({
      pass: passwordBuf,
      salt: saltBuf,
      time: opsLimit,
      mem: memLimit / 1024,
      hashLen: 32,
      parallelism: 1,
      type: 2, // Argon2id
    });
    const key = Buffer.from(result.hash);
    logBuffer("Derived KEK", key, true);
    console.log("DEBUG: --- [Step 1] Finished KEK Derivation ---");
    return key;
  } catch (err) {
    console.error("DEBUG: CRITICAL ERROR during Argon2 hashing.", err);
    throw new Error("Failed to derive key from password. The Argon2 process failed.");
  }
}

export async function decryptMasterKey(
  encryptedKeyB64: string,
  nonceB64: string,
  keyEncryptionKey: Buffer,
): Promise<Buffer> {
  await sodium.ready;
  console.log("DEBUG: --- [Step 2] Starting Master Key (MK) Decryption ---");
  const ciphertext = await fromB64(encryptedKeyB64);
  const nonce = await fromB64(nonceB64);
  const kek = new Uint8Array(keyEncryptionKey);
  logBuffer("Encrypted MK Ciphertext", ciphertext);
  logBuffer("MK Nonce", nonce, true);
  logBuffer("Using KEK for decryption", kek, true);

  const decryptedMessage = sodium.crypto_secretbox_open_easy(ciphertext, nonce, kek);
  if (!decryptedMessage) {
    throw new Error("Failed to decrypt master key. This usually means the password is incorrect.");
  }
  const result = Buffer.from(decryptedMessage);
  logBuffer("Decrypted MK", result, true);
  console.log("DEBUG: --- [Step 2] Finished MK Decryption ---");
  return result;
}

export async function decryptSecretKey(
  encryptedSecretKeyB64: string,
  nonceB64: string,
  masterKey: Buffer,
): Promise<Buffer> {
  await sodium.ready;
  console.log("DEBUG: --- [Step 3] Starting Secret Key (SK) Decryption ---");
  const ciphertext = await fromB64(encryptedSecretKeyB64);
  const nonce = await fromB64(nonceB64);
  const mk = new Uint8Array(masterKey);
  logBuffer("Encrypted SK Ciphertext", ciphertext);
  logBuffer("SK Nonce", nonce, true);
  logBuffer("Using MK for decryption", mk, true);

  const decryptedMessage = sodium.crypto_secretbox_open_easy(ciphertext, nonce, mk);
  if (!decryptedMessage) {
    throw new Error("Failed to decrypt secret key.");
  }
  const result = Buffer.from(decryptedMessage);
  logBuffer("Decrypted SK", result, true);
  console.log("DEBUG: --- [Step 3] Finished SK Decryption ---");
  return result;
}

export async function decryptSessionToken(
  encryptedTokenB64: string,
  publicKeyB64: string,
  secretKey: Buffer,
): Promise<string> {
  await sodium.ready;
  console.log("DEBUG: --- [Step 4] Starting Session Token Decryption (using sealed box) ---");

  const encryptedData = await fromB64(encryptedTokenB64);
  const publicKey = await fromB64(publicKeyB64);
  const sk = new Uint8Array(secretKey);

  logBuffer("Token Encrypted Data (from API)", encryptedData);
  logBuffer("Public Key", publicKey, true);
  logBuffer("Using SECRET KEY for decryption", sk, true);

  const decrypted = sodium.crypto_box_seal_open(encryptedData, publicKey, sk);
  if (!decrypted) {
    console.error("DEBUG: [Step 4] Sealed box decryption FAILED. MAC could not be verified.");
    throw new Error("Failed to decrypt session token using sealed box. Invalid keys or corrupted data.");
  }

  console.log("DEBUG: [Step 4] Sealed box decryption SUCCEEDED.");

  // Convert decrypted bytes to base64url format WITH padding to match CLI implementation
  const tokenBase64Url = sodium.to_base64(decrypted, sodium.base64_variants.URLSAFE);

  console.log("DEBUG: Final token (base64url with padding):", tokenBase64Url);
  console.log("DEBUG: --- [Step 4] Finished Session Token Decryption (base64url with padding) ---");
  return tokenBase64Url;
}

// --- AUTHENTICATOR DATA CRYPTOGRAPHY ---

export async function decryptAuthKey(encryptedKeyB64: string, headerB64: string, masterKey: Buffer): Promise<Buffer> {
  await sodium.ready;
  console.log("DEBUG: --- Starting Auth Key Decryption (secretbox) ---");
  const ciphertext = await fromB64(encryptedKeyB64);
  const nonce = await fromB64(headerB64);
  const mk = new Uint8Array(masterKey);
  logBuffer("Encrypted Auth Key Ciphertext", ciphertext);
  logBuffer("Auth Key Nonce", nonce, true);
  logBuffer("Using Master Key", mk, true);

  const decryptedMessage = sodium.crypto_secretbox_open_easy(ciphertext, nonce, mk);
  if (!decryptedMessage) {
    throw new Error("Failed to decrypt authenticator key.");
  }
  const result = Buffer.from(decryptedMessage);
  logBuffer("Decrypted Auth Key", result, true);
  console.log("DEBUG: --- Finished Auth Key Decryption ---");
  return result;
}

export async function decryptAuthEntity(
  encryptedDataB64: string,
  headerB64: string,
  authenticatorKey: Buffer,
): Promise<string> {
  await sodium.ready;
  console.log("DEBUG: --- Starting Auth Entity Decryption (secretstream) ---");
  const header = await fromB64(headerB64);
  const ciphertext = await fromB64(encryptedDataB64);
  const authKey = new Uint8Array(authenticatorKey);

  logBuffer("Auth Entity Ciphertext", ciphertext);
  logBuffer("Auth Entity Header", header, true);
  logBuffer("Using Authenticator Key", authKey, true);

  const pullState = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, authKey);
  console.log("DEBUG: Initialized entity secretstream pull state successfully.");

  const pullResult = sodium.crypto_secretstream_xchacha20poly1305_pull(pullState, ciphertext, null);
  if (!pullResult) {
    throw new Error("Failed to decrypt authenticator entity.");
  }

  const decryptedString = new TextDecoder().decode(pullResult.message);
  console.log("DEBUG: Successfully decrypted auth entity.");
  console.log("DEBUG: --- Finished Auth Entity Decryption ---");
  return decryptedString;
}

export async function encryptAuthKey(
  authenticatorKey: Buffer,
  masterKey: Buffer,
): Promise<{ encryptedKeyB64: string; headerB64: string }> {
  await sodium.ready;
  console.log("DEBUG: --- Starting Auth Key Encryption (secretbox) ---");

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const authKey = new Uint8Array(authenticatorKey);
  const mk = new Uint8Array(masterKey);

  const ciphertext = sodium.crypto_secretbox_easy(authKey, nonce, mk);
  logBuffer("Generated Nonce (Header)", nonce, true);
  logBuffer("Encrypted Auth Key", ciphertext);
  console.log("DEBUG: --- Finished Auth Key Encryption ---");
  return {
    encryptedKeyB64: await toB64(ciphertext),
    headerB64: await toB64(nonce),
  };
}

export async function generateAuthenticatorKey(): Promise<Buffer> {
  await sodium.ready;
  const key = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
  logBuffer("Generated New Authenticator Key", key, true);
  return Buffer.from(key);
}

// --- SRP AUTHENTICATION CRYPTOGRAPHY ---

/**
 * Derive login key for SRP authentication - exactly matches web implementation
 * This corresponds to the web app's deriveSRPLoginSubKey function
 */
export async function deriveLoginKey(keyEncryptionKey: Buffer): Promise<Buffer> {
  console.log("DEBUG: --- Starting Login Key Derivation for SRP ---");
  logBuffer("Input KEK", keyEncryptionKey, true);

  // Convert KEK to base64 to match web implementation flow
  const kek = bufToBase64(keyEncryptionKey);

  // Use the exact same logic as web app's deriveSRPLoginSubKey
  const kekSubKeyBytes = await deriveSubKeyBytes(kek, 32, 1, "loginctx");

  // Return first 16 bytes as login key (matching web implementation)
  const loginKey = Buffer.from(kekSubKeyBytes.slice(0, 16));
  logBuffer("Derived Login Key", loginKey, true);
  console.log("DEBUG: --- Finished Login Key Derivation ---");
  return loginKey;
}

/**
 * Derive subkey bytes - exactly matches web implementation deriveSubKeyBytes function
 */
async function deriveSubKeyBytes(
  key: string,
  subKeyLength: number,
  subKeyID: number,
  context: string,
): Promise<Uint8Array> {
  await sodium.ready;
  console.log("DEBUG: deriveSubKeyBytes input:", {
    context,
    subKeyID,
    subKeyLength,
    keyLength: key.length,
  });

  // Use the same libsodium function as the web implementation
  const keyBytes = await bytes(key);
  const result = sodium.crypto_kdf_derive_from_key(subKeyLength, subKeyID, context, keyBytes);

  console.log("DEBUG: Successfully derived subkey using crypto_kdf_derive_from_key (matching web implementation)");
  logBuffer("Derived subkey", result, true);
  return result;
}
