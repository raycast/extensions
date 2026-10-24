import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// POSIX locale strings look like `language[_territory][.codeset][@modifier]`,
// e.g. `en_US.UTF-8` or `C`. macOS can also set locale variables to an extended
// identifier such as `en-CZ-u-ca-gregory-...` (a valid ICU locale id but not a
// valid POSIX one), which makes spawned shells print `setlocale` warnings.
const POSIX_LOCALE_PATTERN = /^[A-Za-z]+(_[A-Za-z]+)*(\.[A-Za-z0-9-]+)?(@[A-Za-z0-9]+)?$/;

// Only these are passed to setlocale; other LC_* variables (e.g. LC_TERMINAL)
// must be left alone.
const LOCALE_KEYS = new Set([
  "LANG",
  "LC_ALL",
  "LC_COLLATE",
  "LC_CTYPE",
  "LC_MESSAGES",
  "LC_MONETARY",
  "LC_NUMERIC",
  "LC_TIME",
  "LC_ADDRESS",
  "LC_IDENTIFICATION",
  "LC_MEASUREMENT",
  "LC_NAME",
  "LC_PAPER",
  "LC_TELEPHONE",
]);

function isValidPosixLocale(value: string): boolean {
  return value === "UTF-8" || POSIX_LOCALE_PATTERN.test(value);
}

/** Drops non-POSIX locale values so spawned shells don't emit setlocale warnings. */
export function sanitizeShellEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = { ...env };
  for (const key of Object.keys(result)) {
    if (!LOCALE_KEYS.has(key)) continue;
    const value = result[key];
    if (value !== undefined && !isValidPosixLocale(value)) delete result[key];
  }
  return result;
}

export function shellPath(): string {
  return process.env.SHELL || "/bin/zsh";
}

let cachedEnv: NodeJS.ProcessEnv | undefined;

/**
 * The login shell's environment, so commands find Homebrew/asdf/etc. in PATH.
 * Merged over the process env and sanitized; cached after the first call.
 */
export async function getShellEnvironment(): Promise<NodeJS.ProcessEnv> {
  if (cachedEnv) return cachedEnv;
  try {
    const { stdout } = await execFileAsync(shellPath(), ["-lc", "env -0"], { maxBuffer: 8 * 1024 * 1024 });
    const loginEnv: NodeJS.ProcessEnv = {};
    for (const chunk of stdout.split("\0")) {
      const index = chunk.indexOf("=");
      if (index > 0) loginEnv[chunk.slice(0, index)] = chunk.slice(index + 1);
    }
    cachedEnv = sanitizeShellEnvironment({ ...process.env, ...loginEnv });
  } catch {
    cachedEnv = sanitizeShellEnvironment(process.env);
  }
  return cachedEnv;
}
