import { access, constants, realpath } from "node:fs/promises";
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

/** `kesha.js` ships with `#!/usr/bin/env bun`. Raycast's launchd-rooted PATH
 *  has neither `bun` nor `node` on it, so kernel shebang resolution dies with
 *  exitCode=127. We side-step by looking up the interpreter on disk and
 *  spawning `<interpreter> <kesha.js> ...` instead of relying on the shebang. */
const INTERPRETER_CANDIDATES: ReadonlyArray<string> = [
  join(homedir(), ".bun", "bin", "bun"),
  "/opt/homebrew/bin/bun",
  "/usr/local/bin/bun",
  // Node fallback (kesha.js works with node too, just less optimal).
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
  "/usr/local/opt/node/bin/node",
];

/** Spawn descriptor: `command` plus zero-or-more `prefixArgs` that prepend the
 *  caller's user args. Lets the helper transparently switch between
 *  `[/path/to/kesha]` (when the binary is a real executable) and
 *  `[/path/to/bun, /path/to/kesha.js]` (when the binary is a JS file with a
 *  broken shebang for our launch context). */
export interface KeshaSpawn {
  command: string;
  prefixArgs: string[];
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Read up to `n` bytes from the start of a file as UTF-8. Used to peek at
 *  the shebang without loading large binaries. Returns null on any failure. */
async function readShebang(path: string): Promise<string | null> {
  try {
    const fs = await import("node:fs/promises");
    const fd = await fs.open(path, "r");
    try {
      const buf = Buffer.alloc(128);
      const { bytesRead } = await fd.read(buf, 0, 128, 0);
      if (bytesRead < 2 || buf[0] !== 0x23 || buf[1] !== 0x21) {
        return null; // not "#!"
      }
      const eol = buf.indexOf(0x0a, 0);
      const end = eol > 0 ? eol : bytesRead;
      return buf.slice(2, end).toString("utf8").trim();
    } finally {
      await fd.close();
    }
  } catch {
    return null;
  }
}

async function findInterpreter(name: string): Promise<string | null> {
  for (const path of INTERPRETER_CANDIDATES) {
    if (path.endsWith(`/${name}`) && (await isExecutable(path))) {
      return path;
    }
  }
  return null;
}

/** Build a spawn descriptor for the given binary path. If the file is a
 *  script with a `#!/usr/bin/env <interp>` shebang, look up the interpreter
 *  on disk so we don't depend on Raycast's PATH. Otherwise (compiled binary,
 *  or shebang with absolute interpreter path), call the file directly. */
async function buildSpawn(path: string): Promise<KeshaSpawn | null> {
  if (!(await isExecutable(path))) {
    return null;
  }
  // Resolve symlinks so we can peek at the script body. `~/.bun/bin/kesha`
  // is a symlink into `~/.bun/install/global/.../bin/kesha.js`.
  let resolved = path;
  try {
    resolved = await realpath(path);
  } catch {
    /* keep original */
  }
  const shebang = await readShebang(resolved);
  if (!shebang) {
    return { command: path, prefixArgs: [] };
  }
  // Parse `/usr/bin/env <name> [args...]` shebangs — the case kesha.js uses.
  const envMatch = shebang.match(/^\/usr\/bin\/env\s+([\w.-]+)/);
  if (envMatch) {
    const interp = await findInterpreter(envMatch[1]);
    if (interp) {
      return { command: interp, prefixArgs: [resolved] };
    }
    // Couldn't find the interpreter — fall through and let the kernel try.
    // It'll likely 127, but we surface that rather than guess wrong.
  }
  return { command: path, prefixArgs: [] };
}

/** Resolve a launchable spawn descriptor for `kesha`. Honours the user's
 *  preference first; otherwise probes well-known install paths. Side-steps
 *  the GUI-PATH shebang trap by resolving `#!/usr/bin/env <name>` to an
 *  absolute interpreter path on disk. */
export async function resolveKeshaBin(
  preference: string | undefined,
): Promise<KeshaSpawn | null> {
  const trimmed = preference?.trim();
  if (trimmed) {
    return buildSpawn(trimmed);
  }
  for (const candidate of FALLBACK_CANDIDATES) {
    const spawn = await buildSpawn(candidate);
    if (spawn) {
      return spawn;
    }
  }
  return null;
}

/** Best-effort version probe; confirms the resolved spawn descriptor actually
 *  behaves like `kesha`. Returns `null` on any failure. */
export async function probeKeshaVersion(
  spawn: KeshaSpawn,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      spawn.command,
      [...spawn.prefixArgs, "--version"],
      { timeout: 5000 },
    );
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
