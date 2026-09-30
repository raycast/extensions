import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { DEFAULT_OBSIDIAN_JSON } from "./config";

export const CLI_CANDIDATES = [
  "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli",
  join(homedir(), "Applications/Obsidian.app/Contents/MacOS/obsidian-cli"),
];

export function findCli(preferred?: string, candidates = CLI_CANDIDATES): string | undefined {
  if (preferred) return existsSync(preferred) ? preferred : undefined;
  return candidates.find((path) => existsSync(path));
}

export interface ObsidianRegistry {
  cli: boolean;
  openVaults: string[];
}

export const normalizePath = (path: string) => path.replace(/\/+$/, "");

export function readRegistry(path = DEFAULT_OBSIDIAN_JSON): ObsidianRegistry {
  try {
    const data = JSON.parse(readFileSync(path, "utf8")) as {
      cli?: unknown;
      vaults?: Record<string, { path?: unknown; open?: unknown }>;
    };
    const openVaults = Object.values(data.vaults ?? {})
      .filter((vault) => vault.open === true && typeof vault.path === "string")
      .map((vault) => normalizePath(vault.path as string));
    return { cli: data.cli === true, openVaults };
  } catch {
    return { cli: false, openVaults: [] };
  }
}

export type CliFailure = "cli-disabled" | "not-running" | "quickadd-old" | "vault-not-found" | "unknown";
export type CliResult =
  { kind: "json"; data: Record<string, unknown> } | { kind: "failure"; reason: CliFailure; message: string };

function knownFailure(text: string): CliFailure | undefined {
  if (/not enabled/i.test(text)) return "cli-disabled";
  if (/unable to find Obsidian/i.test(text)) return "not-running";
  if (/Command "quickadd:[^"]*" not found/i.test(text)) return "quickadd-old";
  if (/^Vault not found/im.test(text)) return "vault-not-found";
  return undefined;
}

/**
 * obsidian-cli exits 0 even when it fails, so the outcome is read from stdout. A JSON array (e.g. from
 * `tags format=json`) is wrapped as `{ items }`.
 */
export function classifyCliOutput(stdout: string): CliResult {
  const text = stdout.trim();
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return { kind: "json", data: { items: data } };
      if (data && typeof data === "object") return { kind: "json", data };
    } catch {
      // not JSON after all; classified below
    }
  }
  return { kind: "failure", reason: knownFailure(text) ?? "unknown", message: text };
}

export type CliTextResult = { kind: "text"; text: string } | { kind: "failure"; reason: CliFailure; message: string };

/** For commands that print plain text (e.g. `files`): the text, unless it is a known failure or an `Error:`. */
export function classifyCliText(stdout: string): CliTextResult {
  const text = stdout.trim();
  const reason = knownFailure(text) ?? (/^Error:/.test(text) ? "unknown" : undefined);
  return reason ? { kind: "failure", reason, message: text } : { kind: "text", text: stdout };
}

function execCli(cli: string, args: string[]): Promise<{ output: string; error?: Error }> {
  return new Promise((resolve) => {
    execFile(cli, args, { timeout: 15000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
      const output = `${stdout ?? ""}`.trim() ? `${stdout}` : `${stderr ?? ""}`;
      resolve({ output, error: error ?? undefined });
    });
  });
}

export async function runCli(cli: string, vaultName: string, command: string, args: string[] = []): Promise<CliResult> {
  const { output, error } = await execCli(cli, [`vault=${vaultName}`, command, ...args]);
  if (error && !output.trim()) return { kind: "failure", reason: "unknown", message: error.message };
  return classifyCliOutput(output);
}

export async function runCliText(
  cli: string,
  vaultName: string,
  command: string,
  args: string[] = [],
): Promise<CliTextResult> {
  const { output, error } = await execCli(cli, [`vault=${vaultName}`, command, ...args]);
  if (error && !output.trim()) return { kind: "failure", reason: "unknown", message: error.message };
  return classifyCliText(output);
}
