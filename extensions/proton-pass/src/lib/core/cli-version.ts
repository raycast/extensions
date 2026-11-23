import { stat } from "node:fs/promises";
import { CommandDescriptor, execCli } from "./exec";

/**
 * The oldest pass-cli the extension works with: a CLI Path set to an older one gets a message, and an older pass-cli
 * found on the Mac is passed over. It's raised only when the extension starts using something a newer pass-cli adds,
 * not with the version the extension downloads (PASS_CLI_VERSION), which can be newer.
 */
export const MIN_PASS_CLI_VERSION = "2.5.1";

/**
 * How long `pass-cli --version` may take. It answers at once, but macOS checks a file it has never run before, which
 * can take a few seconds for one as large as pass-cli.
 */
const VERSION_TIMEOUT_MS = 20_000;

/** The version in what `pass-cli --version` prints, e.g. "pass-cli 2.5.1 (0123abc)". */
export function parseCliVersion(output: string): string | undefined {
  return /\d+\.\d+\.\d+/.exec(output)?.[0];
}

/** Below zero when `a` is older than `b`, zero when they're the same version, above zero when it's newer. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function isSupportedCliVersion(version: string): boolean {
  return compareVersions(version, MIN_PASS_CLI_VERSION) >= 0;
}

/**
 * The version of a pass-cli, or nothing when it can't tell, e.g. a script that doesn't pass `--version` on. pass-cli
 * answers `--version` before it opens its session or the keychain.
 */
export async function readCliVersion(
  command: CommandDescriptor,
  options: { env?: NodeJS.ProcessEnv; timeout?: number } = {},
): Promise<string | undefined> {
  try {
    const { stdout } = await execCli(command, ["--version"], {
      env: options.env,
      timeout: options.timeout ?? VERSION_TIMEOUT_MS,
    });
    return parseCliVersion(stdout);
  } catch {
    return undefined;
  }
}

export type CliVersionReader = (file: string, env?: NodeJS.ProcessEnv) => Promise<string | undefined>;

/**
 * Reads a pass-cli's version once, and again only once the file has changed, e.g. after an update: each pass-cli
 * command asks for it, several at once.
 */
export function createCliVersionReader(read = readCliVersion): CliVersionReader {
  const versions = new Map<string, Promise<string | undefined>>();
  return async (file, env) => {
    // A command name rather than a path can't be looked at: it's read once.
    const stamp = await stat(file).then(
      (stats) => `${stats.mtimeMs}:${stats.size}`,
      () => "",
    );
    const key = `${file}\n${stamp}`;
    let version = versions.get(key);
    if (!version) {
      version = read({ file, args: [] }, { env });
      versions.set(key, version);
    }
    return version;
  };
}
