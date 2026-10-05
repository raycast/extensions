import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

import { CliMissingError, resolveCliPath } from "./cli-path";
import { buildItemTemplate } from "./item-template";
import type { SavedItem, Vault, WalletResult } from "./types";

export { CliMissingError } from "./cli-path";

const execFileAsync = promisify(execFile);

export class AuthenticationRequiredError extends Error {}

const AUTH_ERROR_PATTERN = /not signed in|authorization|authenticate|session/i;

export function getCliPath(): string {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  return resolveCliPath(preferences.cliPath);
}

async function execOp(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getCliPath(), args, {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const stderr =
      typeof error === "object" && error && "stderr" in error
        ? String(error.stderr).trim()
        : "";
    const message =
      stderr || (error instanceof Error ? error.message : String(error));
    if (AUTH_ERROR_PATTERN.test(message)) {
      throw new AuthenticationRequiredError(message);
    }
    throw new Error(message);
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    await execOp(["whoami", "--format=json"]);
    return true;
  } catch (error) {
    if (error instanceof CliMissingError) throw error;
    return false;
  }
}

export async function signIn(): Promise<void> {
  await execOp(["signin"]);
}

export async function listVaults(): Promise<Vault[]> {
  const output = await execOp(["vault", "list", "--format=json"]);
  const vaults = JSON.parse(output) as Vault[];
  return vaults.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveWallet(
  result: WalletResult,
  title: string,
  vaultId: string,
): Promise<SavedItem> {
  const args = [
    "item",
    "create",
    `--vault=${vaultId}`,
    "--format=json",
    "--template=/dev/stdin",
  ];
  const input = JSON.stringify(buildItemTemplate(result, title));

  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(getCliPath(), args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (status) => {
      if (status === 0) return resolve(stdout);
      const message = stderr.trim() || "Failed to create the 1Password item.";
      reject(
        AUTH_ERROR_PATTERN.test(message)
          ? new AuthenticationRequiredError(message)
          : new Error(message),
      );
    });
    child.stdin.end(input);
  });

  const item = JSON.parse(output) as {
    id: string;
    title?: string;
    vault?: { name?: string };
    urls?: { href?: string }[];
  };
  return {
    id: item.id,
    title: item.title ?? title,
    vault: item.vault?.name ?? vaultId,
    url: item.urls?.[0]?.href,
  };
}
