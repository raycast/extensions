// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Passig — libreria crittografica di riferimento (TypeScript / libsodium).
 *
 * Tutti i client (Swift, Dart, JS) DEVONO produrre output byte-identici a questa
 * implementazione: stessi algoritmi, stessi parametri, stesso formato di serializzazione.
 * Vedi docs/ARCHITECTURE.md §2-3.
 */
import _sodium from "libsodium-wrappers-sumo";
import type { KdfParams } from "../schemas/common.js";
import { DEFAULT_KDF_PARAMS } from "../schemas/common.js";
import { ItemData } from "../schemas/vault.js";

export const KDF_CONTEXT = "passig__"; // esattamente 8 byte
export const SUBKEY_AUTH = 1;
export const SUBKEY_STRETCH = 2;
export const BLOB_VERSION = "v1";
export const SEALED_VERSION = "s1";
export const KEY_BYTES = 32;
export const SALT_BYTES = 16;
export const NONCE_BYTES = 24;

type Sodium = typeof _sodium;
let sodium: Sodium | null = null;

/** Da chiamare (e attendere) una volta prima di qualsiasi altra funzione. */
export async function initCrypto(): Promise<void> {
  if (sodium) return;
  await _sodium.ready;
  sodium = _sodium;
}

function s(): Sodium {
  if (!sodium) throw new Error("crypto non inizializzato: chiamare initCrypto()");
  return sodium;
}

// ---------- encoding ----------

export function toB64(bytes: Uint8Array): string {
  return s().to_base64(bytes, s().base64_variants.URLSAFE_NO_PADDING);
}
export function fromB64(str: string): Uint8Array {
  return s().from_base64(str, s().base64_variants.URLSAFE_NO_PADDING);
}
export function randomBytes(n: number): Uint8Array {
  return s().randombytes_buf(n);
}
export function memzero(bytes: Uint8Array): void {
  s().memzero(bytes);
}

// ---------- KDF ----------

export function generateKdfSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

/** Argon2id13(masterPassword, salt) → masterKey 32 byte. */
export function deriveMasterKey(
  masterPassword: string,
  kdfSalt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
): Uint8Array {
  if (kdfSalt.length !== SALT_BYTES) throw new Error("kdfSalt deve essere di 16 byte");
  return s().crypto_pwhash(
    KEY_BYTES,
    s().from_string(masterPassword.normalize("NFKC")),
    kdfSalt,
    params.opsLimit,
    params.memLimitBytes,
    s().crypto_pwhash_ALG_ARGON2ID13,
  );
}

export function deriveSubkey(masterKey: Uint8Array, subkeyId: number): Uint8Array {
  return s().crypto_kdf_derive_from_key(KEY_BYTES, subkeyId, KDF_CONTEXT, masterKey);
}
export const deriveAuthKey = (masterKey: Uint8Array) => deriveSubkey(masterKey, SUBKEY_AUTH);
export const deriveStretchKey = (masterKey: Uint8Array) => deriveSubkey(masterKey, SUBKEY_STRETCH);

export interface DerivedKeys {
  authKey: Uint8Array;
  stretchKey: Uint8Array;
}
/** Deriva authKey e stretchKey e azzera la masterKey intermedia. */
export function deriveKeysFromPassword(masterPassword: string, kdfSalt: Uint8Array, params?: KdfParams): DerivedKeys {
  const masterKey = deriveMasterKey(masterPassword, kdfSalt, params);
  const keys = { authKey: deriveAuthKey(masterKey), stretchKey: deriveStretchKey(masterKey) };
  memzero(masterKey);
  return keys;
}

// ---------- simmetrica: XChaCha20-Poly1305 ----------

export function generateKey(): Uint8Array {
  return randomBytes(KEY_BYTES);
}

/** → `v1.<nonce>.<ciphertext>` */
export function encryptBytes(plaintext: Uint8Array, key: Uint8Array): string {
  if (key.length !== KEY_BYTES) throw new Error("chiave da 32 byte attesa");
  const nonce = randomBytes(NONCE_BYTES);
  const ct = s().crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, null, nonce, key);
  return `${BLOB_VERSION}.${toB64(nonce)}.${toB64(ct)}`;
}

export function decryptBytes(blob: string, key: Uint8Array): Uint8Array {
  const [version, nonceB64, ctB64] = blob.split(".");
  if (version !== BLOB_VERSION || !nonceB64 || !ctB64) throw new Error("formato EncryptedBlob non valido");
  const nonce = fromB64(nonceB64);
  if (nonce.length !== NONCE_BYTES) throw new Error("nonce non valido");
  return s().crypto_aead_xchacha20poly1305_ietf_decrypt(null, fromB64(ctB64), null, nonce, key);
}

export function encryptString(plaintext: string, key: Uint8Array): string {
  return encryptBytes(s().from_string(plaintext), key);
}
export function decryptString(blob: string, key: Uint8Array): string {
  return s().to_string(decryptBytes(blob, key));
}

// ---------- asimmetrica: sealed box ----------

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
export function generateKeyPair(): KeyPair {
  const kp = s().crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

/** → `s1.<sealed>` */
export function sealForPublicKey(message: Uint8Array, recipientPublicKey: Uint8Array): string {
  return `${SEALED_VERSION}.${toB64(s().crypto_box_seal(message, recipientPublicKey))}`;
}
export function openSealed(blob: string, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const [version, b64] = blob.split(".");
  if (version !== SEALED_VERSION || !b64) throw new Error("formato SealedBlob non valido");
  return s().crypto_box_seal_open(fromB64(b64), publicKey, privateKey);
}

// ---------- flussi di alto livello ----------

export interface RegistrationMaterial {
  authKey: string; // base64url
  kdfSalt: string; // base64url
  kdfParams: KdfParams;
  publicKey: string; // base64url
  encryptedUserKey: string;
  encryptedPrivateKey: string;
  /** chiavi in chiaro da tenere SOLO in memoria */
  session: UnlockedKeys;
}
export interface UnlockedKeys {
  userKey: Uint8Array;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** Registrazione: genera tutto il materiale da inviare al server. */
export function createRegistrationMaterial(masterPassword: string, params: KdfParams = DEFAULT_KDF_PARAMS): RegistrationMaterial {
  const kdfSalt = generateKdfSalt();
  const { authKey, stretchKey } = deriveKeysFromPassword(masterPassword, kdfSalt, params);
  const userKey = generateKey();
  const kp = generateKeyPair();
  const encryptedUserKey = encryptBytes(userKey, stretchKey);
  const encryptedPrivateKey = encryptBytes(kp.privateKey, userKey);
  memzero(stretchKey);
  const authKeyB64 = toB64(authKey);
  memzero(authKey);
  return {
    authKey: authKeyB64,
    kdfSalt: toB64(kdfSalt),
    kdfParams: params,
    publicKey: toB64(kp.publicKey),
    encryptedUserKey,
    encryptedPrivateKey,
    session: { userKey, publicKey: kp.publicKey, privateKey: kp.privateKey },
  };
}

/** Login step 1: authKey da inviare al server (dopo /auth/prelogin). */
export function computeAuthKey(masterPassword: string, kdfSaltB64: string, params: KdfParams): { authKey: string; stretchKey: Uint8Array } {
  const { authKey, stretchKey } = deriveKeysFromPassword(masterPassword, fromB64(kdfSaltB64), params);
  const out = { authKey: toB64(authKey), stretchKey };
  memzero(authKey);
  return out;
}

/** Login step 2: sblocca userKey e privateKey dalla risposta del server. */
export function unlockUserKeys(
  stretchKey: Uint8Array,
  encryptedUserKey: string,
  encryptedPrivateKey: string,
  publicKeyB64: string,
): UnlockedKeys {
  const userKey = decryptBytes(encryptedUserKey, stretchKey);
  if (userKey.length !== KEY_BYTES) {
    memzero(userKey);
    throw new Error("userKey non valida");
  }
  let privateKey: Uint8Array;
  try {
    privateKey = decryptBytes(encryptedPrivateKey, userKey);
  } catch (err) {
    memzero(userKey);
    throw err;
  }
  return { userKey, privateKey, publicKey: fromB64(publicKeyB64) };
}

/** Cambio master password: nuovo materiale per PUT /auth/password. */
export function createPasswordChangeMaterial(
  currentAuthKeyB64: string,
  newMasterPassword: string,
  userKey: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
) {
  const newKdfSalt = generateKdfSalt();
  const { authKey, stretchKey } = deriveKeysFromPassword(newMasterPassword, newKdfSalt, params);
  const newEncryptedUserKey = encryptBytes(userKey, stretchKey);
  memzero(stretchKey);
  const newAuthKey = toB64(authKey);
  memzero(authKey);
  return {
    currentAuthKey: currentAuthKeyB64,
    newAuthKey,
    newKdfSalt: toB64(newKdfSalt),
    newKdfParams: params,
    newEncryptedUserKey,
  };
}

/** Nuovo vault: genera la vaultKey e la sigilla per il proprietario. */
export function createVaultKey(ownerPublicKey: Uint8Array): { vaultKey: Uint8Array; encryptedVaultKey: string } {
  const vaultKey = generateKey();
  return { vaultKey, encryptedVaultKey: sealForPublicKey(vaultKey, ownerPublicKey) };
}
export function unsealVaultKey(encryptedVaultKey: string, keys: UnlockedKeys): Uint8Array {
  const vk = openSealed(encryptedVaultKey, keys.publicKey, keys.privateKey);
  if (vk.length !== KEY_BYTES) throw new Error("vaultKey non valida");
  return vk;
}
/** Condivisione: sigilla la vaultKey per un altro utente (publicKey da GET /users/lookup). */
export function shareVaultKey(vaultKey: Uint8Array, recipientPublicKeyB64: string): string {
  return sealForPublicKey(vaultKey, fromB64(recipientPublicKeyB64));
}

export function encryptItem(item: ItemData, vaultKey: Uint8Array): string {
  const parsed = ItemData.parse(item);
  return encryptString(JSON.stringify(parsed), vaultKey);
}
export function decryptItem(blob: string, vaultKey: Uint8Array): ItemData {
  return ItemData.parse(JSON.parse(decryptString(blob, vaultKey)));
}

// ---------- generatore password ----------

export interface PasswordOptions {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
}
export function generatePassword(opts: PasswordOptions = {}): string {
  const { length = 20, lowercase = true, uppercase = true, digits = true, symbols = true, excludeAmbiguous = true } = opts;
  let lower = "abcdefghijklmnopqrstuvwxyz";
  let upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let dig = "0123456789";
  const sym = "!@#$%^&*()-_=+[]{};:,.<>?";
  if (excludeAmbiguous) {
    lower = lower.replace(/[l]/g, "");
    upper = upper.replace(/[IO]/g, "");
    dig = dig.replace(/[01]/g, "");
  }
  const sets = [lowercase && lower, uppercase && upper, digits && dig, symbols && sym].filter(Boolean) as string[];
  if (sets.length === 0) throw new Error("almeno un set di caratteri");
  const all = sets.join("");
  const chars: string[] = sets.map((set) => set[s().randombytes_uniform(set.length)]!);
  while (chars.length < length) chars.push(all[s().randombytes_uniform(all.length)]!);
  // Fisher-Yates con random uniforme
  for (let i = chars.length - 1; i > 0; i--) {
    const j = s().randombytes_uniform(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

/** Stima grezza della robustezza (0..4) per la UI. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
  const bits = pw.length * Math.log2(pool || 1);
  if (bits < 28) return 0;
  if (bits < 40) return 1;
  if (bits < 60) return 2;
  if (bits < 80) return 3;
  return 4;
}
