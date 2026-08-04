import { execFileSync } from "child_process";

const SERVICE = "com.raycast.2fas-engine";
const ACCOUNT = "vault-key";

export class KeychainAuthCancelled extends Error {
  constructor() {
    super("Authentication cancelled by user");
    this.name = "KeychainAuthCancelled";
  }
}

export class VaultKeyCorrupted extends Error {
  constructor() {
    super("Vault key has invalid length. Keychain entry may be corrupted.");
    this.name = "VaultKeyCorrupted";
  }
}

export function storeVaultKey(key: Buffer): void {
  try {
    execFileSync(
      "/usr/bin/security",
      [
        "add-generic-password",
        "-s",
        SERVICE,
        "-a",
        ACCOUNT,
        "-w",
        key.toString("base64"),
        "-U",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error: unknown) {
    const execError = error as { stderr?: Buffer };
    throw new Error(
      execError.stderr?.toString().trim() || "Failed to store vault key",
    );
  }
}

export function retrieveVaultKey(): Buffer {
  try {
    const stdout = execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const key = Buffer.from(stdout.toString().trim(), "base64");
    if (key.length !== 32) {
      throw new VaultKeyCorrupted();
    }
    return key;
  } catch (error: unknown) {
    if (error instanceof KeychainAuthCancelled) throw error;
    if (error instanceof VaultKeyCorrupted) throw error;
    const execError = error as { status?: number };
    if (execError.status === 36) throw new KeychainAuthCancelled();
    throw new Error("Failed to retrieve vault key");
  }
}

export function deleteVaultKey(): void {
  try {
    execFileSync(
      "/usr/bin/security",
      ["delete-generic-password", "-s", SERVICE, "-a", ACCOUNT],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    // Key may not exist
  }
}

export function isVaultKeyStored(): boolean {
  try {
    execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-s", SERVICE, "-a", ACCOUNT],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    return true;
  } catch {
    return false;
  }
}
