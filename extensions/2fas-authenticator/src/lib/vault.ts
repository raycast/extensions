import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  existsSync,
} from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import {
  storeVaultKey,
  retrieveVaultKey,
  deleteVaultKey,
  isVaultKeyStored,
  VaultKeyCorrupted,
} from "./keychain";

export interface VaultService {
  id: string;
  name: string;
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}

interface VaultFile {
  v: 1;
  data: string;
  iv: string;
  tag: string;
}

const VAULT_VERSION = 1;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedServices: VaultService[] | null = null;
let cachedAt = 0;

function vaultPath(): string {
  return join(environment.supportPath, "vault.enc");
}

function vaultStagingPath(): string {
  return join(environment.supportPath, "vault.enc.new");
}

function encrypt(plaintext: Buffer, key: Buffer): VaultFile {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: VAULT_VERSION,
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(vault: VaultFile, key: Buffer): Buffer {
  const iv = Buffer.from(vault.iv, "base64");
  const data = Buffer.from(vault.data, "base64");
  const tag = Buffer.from(vault.tag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

function isValidVaultFile(input: unknown): input is VaultFile {
  if (typeof input !== "object" || input === null) return false;
  const v = input as Record<string, unknown>;
  return (
    v.v === VAULT_VERSION &&
    typeof v.data === "string" &&
    v.data.length > 0 &&
    typeof v.iv === "string" &&
    v.iv.length > 0 &&
    typeof v.tag === "string" &&
    v.tag.length > 0
  );
}

function writeVaultAtomic(services: VaultService[], key: Buffer): void {
  const plaintext = Buffer.from(JSON.stringify(services), "utf-8");
  const vaultFile = encrypt(plaintext, key);
  const staging = vaultStagingPath();
  const final = vaultPath();
  writeFileSync(staging, JSON.stringify(vaultFile), {
    encoding: "utf-8",
    mode: 0o600,
  });
  try {
    renameSync(staging, final);
  } catch (error) {
    try {
      unlinkSync(staging);
    } catch {
      // staging may not exist
    }
    throw error;
  }
}

function setVault(services: VaultService[]): void {
  let existingKey: Buffer | null = null;
  if (isVaultKeyStored()) {
    try {
      existingKey = retrieveVaultKey();
    } catch (error) {
      // A corrupt key means the existing vault is already unreadable, so
      // re-keying loses nothing. Any other failure (e.g. auth cancelled)
      // must abort so a readable vault is never destroyed.
      if (!(error instanceof VaultKeyCorrupted)) throw error;
    }
  }

  if (existingKey) {
    // Re-import: reuse the existing key so only the file changes.
    // writeVaultAtomic is atomic, so an interrupted write leaves either the
    // old or the new vault fully intact, never a file orphaned from its key.
    writeVaultAtomic(services, existingKey);
  } else {
    // First create (or an already-unreadable prior vault): generate a key,
    // write the file, then store the key. A crash before the key is stored
    // loses nothing recoverable.
    const key = randomBytes(32);
    writeVaultAtomic(services, key);
    try {
      storeVaultKey(key);
    } catch (error) {
      try {
        unlinkSync(vaultPath());
      } catch {
        // file may not exist
      }
      throw error;
    }
  }

  cachedServices = services;
  cachedAt = Date.now();
}

export function createVault(services: VaultService[]): void {
  setVault(services);
}

export function replaceVault(services: VaultService[]): void {
  setVault(services);
}

export function loadVault(): VaultService[] {
  if (cachedServices && Date.now() - cachedAt < CACHE_TTL_MS) {
    return structuredClone(cachedServices);
  }
  cachedServices = null;
  const raw = readFileSync(vaultPath(), "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!isValidVaultFile(parsed)) {
    throw new Error("Unsupported or malformed vault file");
  }
  const key = retrieveVaultKey();
  const plaintext = decrypt(parsed, key);
  const services = JSON.parse(plaintext.toString("utf-8")) as VaultService[];
  cachedServices = services;
  cachedAt = Date.now();
  return structuredClone(services);
}

export function lockVault(): void {
  cachedServices = null;
  cachedAt = 0;
}

export function isVaultCached(): boolean {
  return cachedServices !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

export function isVaultConfigured(): boolean {
  return existsSync(vaultPath()) && isVaultKeyStored();
}

export function deleteVault(): void {
  try {
    unlinkSync(vaultPath());
  } catch {
    // ENOENT, already gone
  }
  try {
    deleteVaultKey();
  } catch {
    // Key may not exist
  }
  lockVault();
}
