import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { EncryptedVault, Entry, Vault } from "./types";

const VAULT_FILE = "vault.enc";

export function vaultDir(vaultPath: string): string {
  const expanded = vaultPath.startsWith("~") ? join(homedir(), vaultPath.slice(1)) : vaultPath;
  return expanded;
}

export function vaultFilePath(vaultPath: string): string {
  return join(vaultDir(vaultPath), VAULT_FILE);
}

export function loadEncrypted(vaultPath: string): EncryptedVault | null {
  const file = vaultFilePath(vaultPath);
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  try {
    return JSON.parse(raw) as EncryptedVault;
  } catch {
    throw new Error("VAULT_CORRUPT");
  }
}

/** Atomic write: tmp file + rename so a crash can't leave a half-written vault. */
export function saveEncrypted(vaultPath: string, enc: EncryptedVault): void {
  const dir = vaultDir(vaultPath);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `${VAULT_FILE}.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(enc), { mode: 0o600 });
  renameSync(tmp, join(dir, VAULT_FILE));
}

export function vaultExists(vaultPath: string): boolean {
  return existsSync(vaultFilePath(vaultPath));
}

export function newVault(): Vault {
  return { version: 1, groups: [], entries: [] };
}

export function findEntry(vault: Vault, slug: string): Entry | undefined {  return vault.entries.find((e) => e.slug === slug);
}

export function upsertEntry(vault: Vault, entry: Entry): void {
  const i = vault.entries.findIndex((e) => e.slug === entry.slug);
  if (i >= 0) vault.entries[i] = entry;
  else vault.entries.push(entry);
}

export function removeEntry(vault: Vault, slug: string): void {
  vault.entries = vault.entries.filter((e) => e.slug !== slug);
}

export function upsertGroup(vault: Vault, name: string): boolean {
  if (vault.groups.some((g) => g.name === name)) return false;
  vault.groups.push({ name, createdAt: Date.now() });
  return true;
}

export function removeGroup(vault: Vault, name: string): void {
  vault.groups = vault.groups.filter((g) => g.name !== name);
  for (const e of vault.entries) if (e.group === name) delete e.group;
}

export function renameGroupRefs(vault: Vault, oldName: string, newName: string): void {
  for (const e of vault.entries) if (e.group === oldName) e.group = newName;
}
