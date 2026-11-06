import { execAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";
import { getCustomNpxPath, preferences } from "../preferences";

// The extension runs `ccusage@latest`, so the CLI version varies per machine and
// is the single most useful fact for diagnosing schema-mismatch reports. ccusage
// does not include its version in `--json` output, so capture it separately,
// best-effort, and memoize it for the lifetime of the process.

let cachedVersion: string | undefined;
let captureStarted = false;

const versionCommand = (): [string, string[]] =>
  preferences.useDirectCcusageCommand
    ? ["ccusage", ["--version"]]
    : [getCustomNpxPath() ?? "npx", ["ccusage@latest", "--version"]];

export const captureCcusageVersion = async (): Promise<string | undefined> => {
  captureStarted = true;
  try {
    const [command, args] = versionCommand();
    const { stdout } = await execAsync(command, args, getExecOptions());
    const version = stdout.toString().trim();
    if (version) cachedVersion = version;
  } catch {
    // Version is a diagnostic nicety; never let its absence mask the real error.
  }
  return cachedVersion;
};

/**
 * Returns the memoized ccusage version, or `undefined` if it has not been
 * captured yet. The first call from a synchronous context (e.g. a hook's
 * `parseOutput`) kicks off a background capture so later calls (parse errors
 * recur on the refresh interval) can include it.
 */
export const getCcusageVersionSync = (): string | undefined => {
  if (cachedVersion === undefined && !captureStarted) {
    void captureCcusageVersion();
  }
  return cachedVersion;
};
