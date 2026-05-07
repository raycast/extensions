import { access, constants } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Candidates probed in order when `keshaBinPath` preference is empty.
 *  Raycast launches as a GUI app and inherits launchd's PATH (typically just
 *  `/usr/bin:/bin:/usr/sbin:/sbin`), so a `kesha` installed via `bun add -g`,
 *  Homebrew, or `npm i -g` is unreachable through bare `kesha` lookup.
 *  Probing the well-known install locations explicitly avoids the
 *  exitCode=127 ("command not found") that bites every user who has not
 *  manually configured the binary path. */
const FALLBACK_CANDIDATES: ReadonlyArray<string> = [
  // Bun global install (the maintainer-recommended path).
  join(homedir(), ".bun", "bin", "kesha"),
  // Homebrew on Apple Silicon.
  "/opt/homebrew/bin/kesha",
  // Homebrew on Intel.
  "/usr/local/bin/kesha",
  // npm global install (current user).
  join(homedir(), ".npm-global", "bin", "kesha"),
  // pnpm/yarn global install.
  join(homedir(), ".local", "bin", "kesha"),
];

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Resolve the `kesha` binary path, preferring user preference but falling
 *  back to well-known install locations. Returns the first executable path
 *  found, or `null` if nothing resolves. */
export async function resolveKeshaBin(
  preference: string | undefined,
): Promise<string | null> {
  const trimmed = preference?.trim();
  if (trimmed) {
    return (await isExecutable(trimmed)) ? trimmed : null;
  }
  for (const candidate of FALLBACK_CANDIDATES) {
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Best-effort version probe; used by error messages to confirm the resolved
 *  binary actually behaves like `kesha`. Returns `null` on any failure (the
 *  caller will fall through to the standard "kesha not found" hint). */
export async function probeKeshaVersion(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], {
      timeout: 5000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/** User-facing message when neither the preference nor any fallback resolves
 *  to an executable. Lists the probed paths so a user with a non-default
 *  install layout can paste the right one back into preferences. */
export function notFoundMessage(): string {
  return [
    "kesha CLI not found. Set the `kesha binary path` preference to an absolute path,",
    `or install it: \`bun add -g @drakulavich/kesha-voice-kit\`.`,
    `Probed: ${FALLBACK_CANDIDATES.join(", ")}`,
  ].join(" ");
}
