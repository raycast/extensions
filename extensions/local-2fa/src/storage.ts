import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2,
  randomBytes,
} from "node:crypto";
import { promisify } from "node:util";
import type { EncryptedPayload, TotpAccount } from "./types";

const pbkdf2Async = promisify(pbkdf2);

const STORAGE_KEY = "local2fa.accounts.encrypted.v1";
const KDF_ITERATIONS_V2 = 600_000;
const KDF_ITERATIONS_V1_LEGACY = 210_000;

function getMasterPassword(): string {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.masterPassword || prefs.masterPassword.trim().length < 10) {
    throw new Error(
      "Set a Master Password of at least 10 characters in extension preferences",
    );
  }
  return prefs.masterPassword;
}

let keyCache: {
  password: string;
  saltB64: string;
  iterations: number;
  key: Buffer;
} | null = null;

async function deriveKey(
  masterPassword: string,
  salt: Buffer,
  iterations: number,
): Promise<Buffer> {
  const saltB64 = salt.toString("base64");
  if (
    keyCache &&
    keyCache.password === masterPassword &&
    keyCache.saltB64 === saltB64 &&
    keyCache.iterations === iterations
  ) {
    return keyCache.key;
  }
  // pbkdf2 asíncrono: corre en el thread pool de libuv en lugar de bloquear
  // el event loop ~200-500 ms en cada save/delete (UI de Raycast se congela
  // si usamos pbkdf2Sync, ya que el salt cambia en cada escritura y la
  // caché nunca acierta para writes).
  const key = await pbkdf2Async(masterPassword, salt, iterations, 32, "sha256");
  keyCache = { password: masterPassword, saltB64, iterations, key };
  return key;
}

async function encryptAccounts(
  accounts: TotpAccount[],
): Promise<EncryptedPayload> {
  const masterPassword = getMasterPassword();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(masterPassword, salt, KDF_ITERATIONS_V2);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(accounts), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 2,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
    iterations: KDF_ITERATIONS_V2,
  };
}

async function decryptAccounts(
  payload: EncryptedPayload,
): Promise<TotpAccount[]> {
  if (payload.version !== 1 && payload.version !== 2) {
    throw new Error("Unsupported encryption version");
  }

  const iterations =
    payload.version === 2
      ? (payload.iterations ?? KDF_ITERATIONS_V2)
      : KDF_ITERATIONS_V1_LEGACY;

  const masterPassword = getMasterPassword();
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const key = await deriveKey(masterPassword, salt, iterations);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plaintext: string;
  try {
    plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Could not decrypt accounts. Master password is incorrect or stored data is corrupted.",
    );
  }

  const parsed = JSON.parse(plaintext) as TotpAccount[];
  if (!Array.isArray(parsed)) {
    throw new Error(
      "Decrypted vault is corrupted: expected an array of accounts. Aborting to avoid overwriting data.",
    );
  }
  return parsed;
}

export async function listAccounts(): Promise<TotpAccount[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  const payload = JSON.parse(raw) as EncryptedPayload;
  return await decryptAccounts(payload);
}

async function saveAccounts(accounts: TotpAccount[]): Promise<void> {
  const payload = await encryptAccounts(accounts);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

let writeQueue: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

export async function upsertAccount(account: TotpAccount): Promise<void> {
  return serializeWrite(async () => {
    const accounts = await listAccounts();
    const index = accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) {
      accounts[index] = account;
    } else {
      accounts.push(account);
    }
    await saveAccounts(accounts);
  });
}

export async function deleteAccount(id: string): Promise<void> {
  return serializeWrite(async () => {
    const accounts = await listAccounts();
    const next = accounts.filter((item) => item.id !== id);
    await saveAccounts(next);
  });
}
