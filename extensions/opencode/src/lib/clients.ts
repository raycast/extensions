import { execSync } from "child_process";
import { createOpencode, OpencodeClient } from "@opencode-ai/sdk/v2";

let instance: { client: OpencodeClient; server: { url: string; close(): void } } | null = null;
let initializing: Promise<OpencodeClient> | null = null;

/**
 * Ensure Homebrew paths are in PATH so `opencode` binary is found.
 * Raycast's Node.js environment has a minimal PATH.
 */
function ensurePath(): void {
  const current = process.env.PATH ?? "";
  const extraPaths = ["/opt/homebrew/bin", "/usr/local/bin"];

  try {
    const shellPath = execSync("zsh -ilc 'echo $PATH'", { encoding: "utf-8" }).trim();
    if (shellPath) {
      process.env.PATH = `${shellPath}:${current}`;
      return;
    }
  } catch {
    // Fallback to known paths
  }

  for (const p of extraPaths) {
    if (!current.includes(p)) {
      process.env.PATH = `${p}:${current}`;
    }
  }
}

function isOpencodeInstalled(): boolean {
  try {
    execSync("which opencode", { encoding: "utf-8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export class OpencodeNotInstalledError extends Error {
  constructor() {
    super("OpenCode is not installed. Install it with: brew install anomalyco/tap/opencode");
    this.name = "OpencodeNotInstalledError";
  }
}

/**
 * Get an SDK client backed by a managed OpenCode server.
 * Starts the server once and reuses it across all hook calls.
 * Throws OpencodeNotInstalledError if the binary is missing.
 */
export async function getClient(): Promise<OpencodeClient> {
  if (instance) return instance.client;

  if (!initializing) {
    initializing = (async () => {
      ensurePath();
      if (!isOpencodeInstalled()) {
        throw new OpencodeNotInstalledError();
      }
      instance = await createOpencode({ port: 0 });
      return instance.client;
    })().catch((err) => {
      initializing = null;
      throw err;
    });
  }

  const client = await initializing;
  return client;
}
