import { access, constants, open, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const FALLBACK_CANDIDATES: ReadonlyArray<string> = [
  join(homedir(), ".bun", "bin", "kesha"),
  "/opt/homebrew/bin/kesha",
  "/usr/local/bin/kesha",
  join(homedir(), ".npm-global", "bin", "kesha"),
  join(homedir(), ".local", "bin", "kesha"),
];

const INTERPRETER_CANDIDATES: ReadonlyArray<string> = [
  join(homedir(), ".bun", "bin", "bun"),
  "/opt/homebrew/bin/bun",
  "/usr/local/bin/bun",
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
  "/usr/local/opt/node/bin/node",
];

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

async function readShebang(path: string): Promise<string | null> {
  try {
    const fd = await open(path, "r");
    try {
      const buf = Buffer.alloc(128);
      const { bytesRead } = await fd.read(buf, 0, 128, 0);
      if (bytesRead < 2 || buf[0] !== 0x23 || buf[1] !== 0x21) {
        return null;
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

async function buildSpawn(path: string): Promise<KeshaSpawn | null> {
  if (!(await isExecutable(path))) {
    return null;
  }
  let resolved = path;
  try {
    resolved = await realpath(path);
  } catch {
    // Keep original path if the symlink target cannot be resolved.
  }
  const shebang = await readShebang(resolved);
  if (!shebang) {
    return { command: path, prefixArgs: [] };
  }
  const envMatch = shebang.match(/^\/usr\/bin\/env\s+([\w.-]+)/);
  if (envMatch) {
    const interp = await findInterpreter(envMatch[1]);
    if (interp) {
      return { command: interp, prefixArgs: [resolved] };
    }
  }
  return { command: path, prefixArgs: [] };
}

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

export async function probeKeshaVersion(
  spawn: KeshaSpawn,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      spawn.command,
      [...spawn.prefixArgs, "--version"],
      {
        timeout: 5000,
      },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export function notFoundMessage(): string {
  return [
    "kesha CLI not found. Set the `kesha` binary path preference to an absolute path,",
    "or install it with `bun add -g @drakulavich/kesha-voice-kit`.",
    `Probed: ${FALLBACK_CANDIDATES.join(", ")}`,
  ].join(" ");
}
