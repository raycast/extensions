import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";
import {
  storeVaultKey,
  retrieveVaultKey,
  deleteVaultKey,
  isVaultKeyStored,
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

let cachedServices: VaultService[] | null = null;

function vaultPath(): string {
  return join(environment.supportPath, "vault.enc");
}

function encrypt(plaintext: Buffer, key: Buffer): VaultFile {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
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

export function createVault(services: VaultService[]): void {
  const key = randomBytes(32);
  const plaintext = Buffer.from(JSON.stringify(services), "utf-8");
  const vaultFile = encrypt(plaintext, key);
  const path = vaultPath();
  writeFileSync(path, JSON.stringify(vaultFile), {
    encoding: "utf-8",
    mode: 0o600,
  });
  try {
    storeVaultKey(key);
  } catch (error) {
    unlinkSync(path);
    throw error;
  }
  cachedServices = services;
}

export function loadVault(): VaultService[] {
  if (cachedServices) return cachedServices;
  const raw = readFileSync(vaultPath(), "utf-8");
  const vaultFile: VaultFile = JSON.parse(raw);
  const key = retrieveVaultKey();
  const plaintext = decrypt(vaultFile, key);
  cachedServices = JSON.parse(plaintext.toString("utf-8"));
  return cachedServices!;
}

export function isVaultConfigured(): boolean {
  return existsSync(vaultPath()) && isVaultKeyStored();
}

export function deleteVault(): void {
  const path = vaultPath();
  if (existsSync(path)) unlinkSync(path);
  try {
    deleteVaultKey();
  } catch {
    // Key may not exist
  }
  cachedServices = null;
}
