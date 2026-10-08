import { execFileSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";

const SERVICE = "com.raycast.2fas-engine";
const ACCOUNT = "vault-key";

const WINDOWS_KEY_PATH = join(environment.supportPath, "vault-key.dpapi");

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

function protectWithDpapi(key: Buffer): string {
  const script = `
Add-Type -AssemblyName System.Security
$inputData = [Console]::In.ReadToEnd().Trim()
$bytes = [Convert]::FromBase64String($inputData)
$protected = [Security.Cryptography.ProtectedData]::Protect(
    $bytes,
    $null,
    [Security.Cryptography.DataProtectionScope]::CurrentUser
)
[Convert]::ToBase64String($protected)
`;

  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      input: key.toString("base64"),
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  ).trim();
}

function unprotectWithDpapi(data: string): Buffer {
  const script = `
Add-Type -AssemblyName System.Security

try {
    $inputData = [Console]::In.ReadToEnd().Trim()
    $bytes = [Convert]::FromBase64String($inputData)
    $unprotected = [Security.Cryptography.ProtectedData]::Unprotect(
        $bytes,
        $null,
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [Convert]::ToBase64String($unprotected)
}
catch {
    [Console]::Error.Write("__2FAS_DPAPI_CORRUPTED__")
    exit 42
}
`;

  try {
    const result = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      {
        input: data,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    ).trim();

    return Buffer.from(result, "base64");
  } catch (error: unknown) {
    const execError = error as { stderr?: Buffer | string };
    const stderr = execError.stderr?.toString() ?? "";

    if (stderr.includes("__2FAS_DPAPI_CORRUPTED__")) {
      throw new VaultKeyCorrupted();
    }

    throw error;
  }
}

export function storeVaultKey(key: Buffer): void {
  if (process.platform === "win32") {
    try {
      const protectedKey = protectWithDpapi(key);

      writeFileSync(WINDOWS_KEY_PATH, protectedKey, {
        encoding: "utf-8",
        mode: 0o600,
      });
    } catch {
      throw new Error("Failed to store vault key");
    }

    return;
  }

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
  if (process.platform === "win32") {
    try {
      const protectedKey = readFileSync(WINDOWS_KEY_PATH, "utf-8").trim();
      const key = unprotectWithDpapi(protectedKey);

      if (key.length !== 32) {
        throw new VaultKeyCorrupted();
      }

      return key;
    } catch (error: unknown) {
      if (error instanceof VaultKeyCorrupted) throw error;
      throw new Error("Failed to retrieve vault key");
    }
  }

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

    if (execError.status === 36) {
      throw new KeychainAuthCancelled();
    }

    throw new Error("Failed to retrieve vault key");
  }
}

export function deleteVaultKey(): void {
  if (process.platform === "win32") {
    try {
      unlinkSync(WINDOWS_KEY_PATH);
    } catch (error: unknown) {
      const fsError = error as NodeJS.ErrnoException;

      if (fsError.code !== "ENOENT") {
        throw error;
      }
    }

    return;
  }

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
  if (process.platform === "win32") {
    return existsSync(WINDOWS_KEY_PATH);
  }

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
