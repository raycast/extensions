import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Raycast's exec context has a minimal PATH, so the binary is resolved
// from the preference or from common install locations, never from PATH.
const CANDIDATES = ["/opt/homebrew/bin/agentcfg", "/usr/local/bin/agentcfg", join(homedir(), "go", "bin", "agentcfg")];

export interface Item {
  kind: string;
  name: string;
  path: string;
}

export interface StatusEntry {
  target: string;
  kind: string;
  item: string;
  status: string;
  path?: string;
  dest: string;
  plugin?: string;
}

export function resolveBinary(): string | undefined {
  const { binaryPath } = getPreferenceValues<{ binaryPath?: string }>();
  if (binaryPath?.trim()) return binaryPath.trim();
  return CANDIDATES.find((p) => existsSync(p));
}

export function toErrorMessage(stderr: string, fallback: string): string {
  const raw = stderr.trim() || fallback;
  if (raw.includes("unknown flag: --json")) {
    return "Your agentcfg binary is too old for this extension. Update it with brew upgrade agentcfg or go install.";
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // stderr is not JSON; fall through to the raw text
  }
  return raw.replace(/^agentcfg:\s*/, "");
}

export function parseJsonOutput<T>(out: { stdout: string; stderr: string; exitCode: number | null }): T {
  if (out.exitCode !== 0) {
    throw new Error(toErrorMessage(out.stderr, `agentcfg exited with code ${out.exitCode}`));
  }
  return JSON.parse(out.stdout) as T;
}

export async function runAgentcfg(args: string[]): Promise<string> {
  const bin = resolveBinary();
  if (!bin) {
    throw new Error(
      "agentcfg binary not found. Install it (brew install jorgenosberg/tap/agentcfg) or set its path in the extension preferences.",
    );
  }
  try {
    const { stdout } = await execFileAsync(bin, args);
    return stdout;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? "";
    throw new Error(toErrorMessage(stderr, error instanceof Error ? error.message : String(error)));
  }
}
