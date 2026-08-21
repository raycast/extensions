import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const FALLBACK_CLI =
  "/Applications/LokalBot.app/Contents/Helpers/lokalbot-cli";

interface Preferences {
  cliPath: string;
}

/** Error thrown when the LokalBot CLI cannot be located or executed. */
export class CliMissingError extends Error {}

/**
 * Resolve the CLI path from preferences, falling back to the helper binary
 * embedded inside /Applications/LokalBot.app when the configured path
 * (default "lokalbot-cli" on PATH) does not exist.
 */
export async function resolveCli(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  for (const candidate of [prefs.cliPath || "lokalbot-cli", FALLBACK_CLI]) {
    try {
      await execFileAsync(candidate, ["--help"], { timeout: 5_000 });
      return candidate;
    } catch (error) {
      // Any error besides "binary not found" still proves the binary exists.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      return candidate;
    }
  }
  throw new CliMissingError("lokalbot-cli not found");
}

/**
 * Run a lokalbot-cli subcommand and parse its default JSON output.
 * Throws CliMissingError when neither the preferred nor fallback path works.
 */
export async function runCli<T>(...args: string[]): Promise<T> {
  let cli: string;
  try {
    cli = await resolveCli();
  } catch {
    throw new CliMissingError(
      "Install LokalBot — https://github.com/stevyhacker/lokalbot/releases",
    );
  }
  const { stdout } = await execFileAsync(cli, args, {
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

/** Run a CLI subcommand that returns a plain-text path (no JSON). */
export async function runCliPath(...args: string[]): Promise<string> {
  const cli = await resolveCli();
  const { stdout } = await execFileAsync(cli, args);
  return stdout.trim();
}

/** Standard empty-list guidance shown when the CLI is missing entirely. */
