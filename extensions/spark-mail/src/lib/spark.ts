import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { sparkSearch } from "./platform";

const execFileAsync = promisify(execFile);

/**
 * Raycast's Node runtime has a minimal PATH, so a bare `spark` often won't
 * resolve. Prepend the common install dirs before the inherited PATH:
 * Homebrew + /usr/local on macOS, the Spark Desktop bundle dir on Windows.
 * (Pattern borrowed from the colima extension.)
 */
const SEARCH = sparkSearch(process.platform, process.env);

const BASE_PATH = [...SEARCH.dirs, process.env.PATH ?? ""].join(delimiter);

const CLI_ENV: NodeJS.ProcessEnv = { ...process.env, PATH: BASE_PATH };

/** Look for a `spark` executable in each directory on BASE_PATH. */
function resolveSparkOnPath(): string | null {
  for (const dir of BASE_PATH.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, SEARCH.bin);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** The configured `spark` path, if any (a non-empty preference value). */
function sparkPathPreference(): string | undefined {
  return getPreferenceValues<Preferences>().sparkPath?.trim() || undefined;
}

/** Absolute path to the `spark` binary (preference wins, else common defaults). */
export function getSparkPath(): string {
  return sparkPathPreference() ?? resolveSparkOnPath() ?? "spark";
}

export function isSparkInstalled(): boolean {
  const pref = sparkPathPreference();
  if (pref) return existsSync(pref);
  return resolveSparkOnPath() !== null;
}

/** Shell command that prints the `spark` binary location on this platform. */
export const FIND_SPARK_CMD = SEARCH.findCmd;

/** A user-facing error whose message is already safe to show in a toast. */
export class SparkError extends Error {}

/**
 * Run a `spark` subcommand and return stdout. Throws a SparkError with a
 * friendly message for the common failure modes (binary missing, Spark Desktop
 * not running, insufficient access level).
 */
export async function runSpark(
  args: string[],
  timeout = 20_000,
): Promise<string> {
  const bin = getSparkPath();
  try {
    const { stdout } = await execFileAsync(bin, args, {
      env: CLI_ENV,
      timeout,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout.replace(/\r\n/g, "\n");
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    if (err.code === "ENOENT") {
      throw new SparkError(
        `Spark CLI not found. Set its path in extension preferences (\`${FIND_SPARK_CMD}\`).`,
      );
    }
    const detail = (err.stderr || err.stdout || err.message || "").trim();
    if (
      /not connect|not running|launch spark|no.*instance|can't access|cannot access/i.test(
        detail,
      )
    ) {
      throw new SparkError(
        "Spark Desktop isn't running. Launch the Spark app and try again.",
      );
    }
    if (/access|read-only|permission|triage/i.test(detail)) {
      throw new SparkError(
        detail ||
          "This action needs higher access. Enable triage in Spark → Settings → AI Agents.",
      );
    }
    throw new SparkError(detail || `spark ${args.join(" ")} failed`);
  }
}

export * from "./parse";
