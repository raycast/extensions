import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import type { InteractiveSession } from "./interactive";
import type {
  ChoiceRef,
  InteractiveResponse,
  ListResponse,
  RunResponse,
} from "./types";
import {
  type Readiness,
  type Registry,
  type Vault,
  ensureVaultReady,
} from "./vaults";

const execFileAsync = promisify(execFile);

const CLI_CANDIDATES = [
  "/opt/homebrew/bin/obsidian",
  "/usr/local/bin/obsidian",
  "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli",
  `${homedir()}/Applications/Obsidian.app/Contents/MacOS/obsidian-cli`,
];

interface Preferences {
  cliPath?: string;
}

/** Raised for transport-level failures (CLI missing, Obsidian/vault unreachable). */
export class ObsidianCliError extends Error {}

export function resolveCliPath(): string {
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = cliPath?.trim() ? [cliPath.trim()] : CLI_CANDIDATES;
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new ObsidianCliError(
    "Obsidian CLI not found. Enable it in Obsidian (Settings → General → Command line interface) or set its path in the extension preferences.",
  );
}

/**
 * Invoke an Obsidian CLI command and parse QuickAdd's JSON envelope.
 *
 * The CLI always exits 0. Plugin-level failures come back as JSON
 * `{ok:false, error}` (returned as-is for the caller to handle); transport
 * failures ("Vault not found.", Obsidian not running) are plain text and are
 * thrown as ObsidianCliError.
 */
export async function invoke<T extends { ok: boolean }>(
  vault: Vault,
  command: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const cli = resolveCliPath();
  const args = [`vault=${vault.name}`, command];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    // execFile passes each entry as one argv element, so no shell quoting is
    // needed even for values with spaces/newlines.
    args.push(value === "" ? key : `${key}=${value}`);
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(cli, args, {
      timeout: 10 * 60 * 1000, // macros can run long (AI, network)
      maxBuffer: 16 * 1024 * 1024,
    }));
  } catch (error) {
    // The CLI exits nonzero on aborted runs but still prints QuickAdd's JSON
    // envelope (with the actionable error) on stdout. Prefer that over the
    // generic exec error.
    const failedStdout =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout: unknown }).stdout).trim()
        : "";
    if (failedStdout) {
      try {
        return JSON.parse(failedStdout) as T;
      } catch {
        throw new ObsidianCliError(failedStdout);
      }
    }
    throw new ObsidianCliError(
      `Obsidian CLI failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const output = stdout.trim();
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new ObsidianCliError(
      output || "Obsidian CLI returned no output. Is Obsidian running?",
    );
  }
}

export async function prepareVault(
  vault: Vault,
  choiceId: string | undefined,
  registry: Registry,
): Promise<Readiness> {
  // Callers render a failed Readiness; a rejection would leave them loading.
  try {
    const cli = resolveCliPath();
    return await ensureVaultReady(vault, choiceId, {
      registry,
      open: async (url) => {
        await execFileAsync("open", ["-g", url]);
      },
      runCli: async (args) => {
        try {
          return (await execFileAsync(cli, args, { timeout: 10_000 })).stdout;
        } catch {
          return "";
        }
      },
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: Date.now,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function listChoices(vault: Vault): Promise<ListResponse> {
  return invoke<ListResponse>(vault, "quickadd:list", {});
}

export async function startInteractive(
  vault: Vault,
  choiceId: string,
  vars?: Record<string, string>,
): Promise<{ session: InteractiveSession; choice: ChoiceRef }> {
  const response = await invoke<InteractiveResponse>(
    vault,
    "quickadd:interactive",
    { id: choiceId, vars: vars && JSON.stringify(vars) },
  );
  const { port, sessionId, token, choice } = response;
  if (!response.ok || !port || !sessionId || !token || !choice) {
    throw new ObsidianCliError(
      response.error ??
        "Interactive run could not be started (needs QuickAdd with the interactive bridge).",
    );
  }
  return {
    session: { host: response.host ?? "127.0.0.1", port, sessionId, token },
    choice,
  };
}

export interface RunOptions {
  /** Allow interactive prompts inside Obsidian instead of failing headlessly. */
  ui?: boolean;
  /** Values may be arrays (multi-select variables); passed verbatim via vars JSON. */
  vars?: Record<string, unknown>;
}

function runParams(options: RunOptions): Record<string, string | undefined> {
  return {
    vars:
      options.vars && Object.keys(options.vars).length > 0
        ? JSON.stringify(options.vars)
        : undefined,
    ui: options.ui ? "" : undefined,
    // Verified outcome (QuickAdd >= 2.14): honest failures + created file
    // path for Template/Capture. Older versions ignore the flag.
    verify: "",
  };
}

export async function runChoice(
  vault: Vault,
  choiceId: string,
  options: RunOptions = {},
): Promise<RunResponse> {
  return invoke<RunResponse>(vault, "quickadd:run", {
    id: choiceId,
    ...runParams(options),
  });
}

export async function runChoiceByName(
  vault: Vault,
  name: string,
  options: RunOptions = {},
): Promise<RunResponse> {
  return invoke<RunResponse>(vault, "quickadd:run", {
    choice: name,
    ...runParams(options),
  });
}

export function obsidianOpenUrl(
  vault: Vault,
  vaultRelativePath?: string,
): string {
  const url = `obsidian://open?vault=${encodeURIComponent(vault.name)}`;
  return vaultRelativePath
    ? `${url}&file=${encodeURIComponent(vaultRelativePath)}`
    : url;
}
