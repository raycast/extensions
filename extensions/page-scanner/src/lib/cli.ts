/**
 * Runs the `page-scanner` command vendored in `assets/` (scripts/vendor-cli.mjs, from the
 * @page-scanner/cli release package.json pins) with the Node Raycast runs this extension on, and
 * reads its `--json` answer. Both vendored files are checked against the hashes recorded when
 * they were vendored before the first run.
 *
 * A child process rather than `import { scan } from '@page-scanner/cli'`, for two reasons. The
 * CLI starts its daemon by running its own entry point again, which inside Raycast's bundle
 * would be Raycast's worker, not the CLI; run as a file of its own, the bundle is `argv[1]` and
 * starts itself, as the `.mcpb` does. And Raycast unloads a command when it returns, which
 * would take an in-process daemon down with it; a spawned one outlives the command and serves
 * the next.
 */
import { execFile } from "node:child_process";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { CLI_VENDOR } from "../vendor/cli-integrity";
import { mismatchedFiles } from "./integrity";

export { EXIT, isSetupMissing, type CliFailure, type CliResult } from "./cli-answer";
import type { CliResult } from "./cli-answer";

export const bundlePath = () => join(environment.assetsPath, "page-scanner.mjs");

let verified = false;

/** Throws when a vendored file is not the one that was vendored. Hashed once per process. */
function verifyVendoredCli() {
  if (verified) return;
  const bad = mismatchedFiles(environment.assetsPath, CLI_VENDOR.sha256);
  if (bad.length > 0) {
    throw new Error(
      `The bundled Page Scanner command failed its integrity check (${bad.join(", ")}). Reinstall the extension.`,
    );
  }
  verified = true;
}

/**
 * Runs one command with `--json` and resolves with its answer, whatever the exit code. Rejects
 * only when there is no answer to read: the process could not start, or printed no JSON.
 */
export function runCli<T>(
  args: readonly string[],
  { timeoutMs = 60_000 }: { timeoutMs?: number } = {},
): Promise<CliResult<T>> {
  try {
    verifyVendoredCli();
  } catch (error) {
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [bundlePath(), ...args, "--json"],
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === "number" ? error.code : -1) : 0;
        try {
          resolve({ exitCode, answer: JSON.parse(stdout) as CliResult<T>["answer"] });
        } catch {
          const reason = error?.killed ? `timed out after ${timeoutMs / 1000}s` : stderr.trim();
          reject(new Error(`page-scanner ${args[0] ?? ""} gave no answer: ${reason || "no output"}`));
        }
      },
    );
  });
}

/** `status --json`, the parts this extension reads. */
export interface StatusAnswer {
  paired: boolean;
  daemon: { running: boolean } | null;
  browsers: { browserId: string; label: string }[];
  nativeHost: {
    hostInstalled: boolean;
    node: string | null;
    nodeFound: boolean;
    /** `allowsStore`: its manifest lets both store builds, Chrome's and Edge's, start the helper. */
    browsers: { name: string; installed: boolean; allowsStore: boolean }[];
  };
}

export interface TabsAnswer {
  browserId: string;
  label: string;
  windows: { windowId: number; focused: boolean; windowType: string; tabCount: number }[];
  tabs: { tabId: number; windowId: number; url: string; title: string; active: boolean }[];
}

export interface ScanAnswer {
  path: string;
  fileName: string;
  page?: { title: string; url: string; markdownPath?: string };
}

export interface BrowsersAnswer {
  browsers: { browserId: string; label: string }[];
}
