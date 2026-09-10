import { LocalStorage } from "@raycast/api";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MASTER_KEY_STORAGE_KEY = "history-master-key-v1";

interface EncryptedEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

async function getMasterKey(): Promise<Buffer> {
  const stored = await LocalStorage.getItem<string>(MASTER_KEY_STORAGE_KEY);
  if (stored) {
    const key = Buffer.from(stored, "base64");
    if (key.length === 32) return key;
  }

  const key = randomBytes(32);
  await LocalStorage.setItem(MASTER_KEY_STORAGE_KEY, key.toString("base64"));
  return key;
}

export async function encryptJson(value: unknown): Promise<string> {
  const key = await getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const envelope: EncryptedEnvelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope);
}

export async function decryptJson<T>(payload: string): Promise<T> {
  const envelope = JSON.parse(payload) as EncryptedEnvelope;
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported encrypted data format.");
  }

  const key = await getMasterKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

export async function readEncryptedJson<T>(
  filePath: string,
): Promise<T | undefined> {
  let primaryError: unknown;
  try {
    return await decryptJson<T>(await readFile(filePath, "utf8"));
  } catch (error) {
    primaryError = error;
  }

  try {
    return await decryptJson<T>(await readFile(`${filePath}.backup`, "utf8"));
  } catch (backupError) {
    const primaryCode = (primaryError as NodeJS.ErrnoException).code;
    const backupCode = (backupError as NodeJS.ErrnoException).code;
    if (primaryCode === "ENOENT" && backupCode === "ENOENT") return undefined;
    throw primaryCode === "ENOENT" ? backupError : primaryError;
  }
}

export async function writeEncryptedPayload(
  filePath: string,
  payload: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${filePath}.backup`;
  await writeFile(temporaryPath, payload, { encoding: "utf8", mode: 0o600 });
  try {
    await rename(temporaryPath, filePath);
    await rm(backupPath, { force: true });
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "EPERM" && code !== "ENOTEMPTY")
      throw error;
  }

  await rm(backupPath, { force: true });
  let movedExistingFile = false;
  try {
    await rename(filePath, backupPath);
    movedExistingFile = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    if (movedExistingFile) {
      await rename(backupPath, filePath).catch(() => undefined);
    }
    throw error;
  }

  if (movedExistingFile) {
    await rm(backupPath, { force: true });
  }
}

export async function writeEncryptedJson(
  filePath: string,
  value: unknown,
): Promise<number> {
  const payload = await encryptJson(value);
  await writeEncryptedPayload(filePath, payload);
  return Buffer.byteLength(payload, "utf8");
}
