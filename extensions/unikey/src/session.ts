import { decryptVault, encryptVault } from "./crypto";
import { loadEncrypted, newVault, saveEncrypted, vaultExists } from "./vault";
import { EncryptedVault, Vault } from "./types";

/**
 * Master password lives in module memory only.
 * It is never written to disk, LocalStorage, or preferences.
 * Cleared when Raycast kills the extension process (natural session end).
 */
let masterPassword: string | null = null;

export function getMaster(): string | null {
  return masterPassword;
}

export function setMaster(pw: string): void {
  masterPassword = pw;
}

export function clearMaster(): void {
  masterPassword = null;
}

export function isUnlocked(): boolean {
  return masterPassword !== null;
}

/** Returns decrypted vault, or throws WRONG_PASSWORD / VAULT_CORRUPT. */
export function unlock(dir: string, pw: string): Vault {
  const enc = loadEncrypted(dir);
  if (!enc) throw new Error("NO_VAULT");
  const vault = decryptVault(enc, pw);
  setMaster(pw);
  return vault;
}

export function loadOrThrow(dir: string): Vault {
  if (!masterPassword) throw new Error("LOCKED");
  const enc = loadEncrypted(dir);
  if (!enc) return newVault();
  return decryptVault(enc, masterPassword);
}

export function persistVault(dir: string, vault: Vault): void {
  if (!masterPassword) throw new Error("LOCKED");
  saveEncrypted(dir, encryptVault(vault, masterPassword));
}

export function ensureVaultFile(dir: string, pw: string): void {
  if (vaultExists(dir)) return;
  saveEncrypted(dir, encryptVault(newVault(), pw));
}

export function readEncrypted(dir: string): EncryptedVault | null {
  return loadEncrypted(dir);
}

/**
 * Auto-unlock: silent Keychain read → AES decrypt. No UI, no prompts.
 * Returns the vault on success, or null when there is no stored password
 * or the stored password doesn't decrypt this vault (user falls back to form).
 */
export async function tryAutoUnlock(dir: string): Promise<Vault | null> {
  if (!vaultExists(dir)) return null;

  const { keychainLoad } = await import("./keychain");
  const pw = await keychainLoad();
  if (!pw) return null;

  try {
    return unlock(dir, pw);
  } catch {
    // Stored password doesn't match this vault — keep the entry,
    // let the user resolve it via the manual form.
    return null;
  }
}
