import { access, constants, open, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PROBE_TIMEOUT_MS } from "./dictation-config";

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

export interface KeshaBinDeps {
  candidates?: ReadonlyArray<string>;
  interpreterCandidates?: ReadonlyArray<string>;
  isExecutable?: (path: string) => Promise<boolean>;
  readShebang?: (path: string) => Promise<string | null>;
  realpath?: (path: string) => Promise<string>;
}

async function defaultIsExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function parseShebang(head: Buffer): string | null {
  if (head.length < 2 || head[0] !== 0x23 || head[1] !== 0x21) {
    return null;
  }
  const eol = head.indexOf(0x0a);
  const end = eol > 0 ? eol : head.length;
  return head.subarray(2, end).toString("utf8").trim();
}

async function defaultReadShebang(path: string): Promise<string | null> {
  try {
    const fd = await open(path, "r");
    try {
      const buf = Buffer.alloc(128);
      const { bytesRead } = await fd.read(buf, 0, 128, 0);
      return parseShebang(buf.subarray(0, bytesRead));
    } finally {
      await fd.close();
    }
  } catch {
    return null;
  }
}

function withDefaults(deps: KeshaBinDeps): Required<KeshaBinDeps> {
  return {
    candidates: FALLBACK_CANDIDATES,
    interpreterCandidates: INTERPRETER_CANDIDATES,
    isExecutable: defaultIsExecutable,
    readShebang: defaultReadShebang,
    realpath,
    ...deps,
  };
}

async function findInterpreter(
  name: string,
  deps: Required<KeshaBinDeps>,
): Promise<string | null> {
  for (const path of deps.interpreterCandidates) {
    if (path.endsWith(`/${name}`) && (await deps.isExecutable(path))) {
      return path;
    }
  }
  return null;
}

async function buildSpawn(
  path: string,
  deps: Required<KeshaBinDeps>,
): Promise<KeshaSpawn | null> {
  if (!(await deps.isExecutable(path))) {
    return null;
  }
  let resolved = path;
  try {
    resolved = await deps.realpath(path);
  } catch {
    // Keep original path if the symlink target cannot be resolved.
  }
  const shebang = await deps.readShebang(resolved);
  if (!shebang) {
    return { command: path, prefixArgs: [] };
  }
  const envMatch = shebang.match(/^\/usr\/bin\/env\s+([\w.-]+)/);
  if (envMatch) {
    const interp = await findInterpreter(envMatch[1], deps);
    if (interp) {
      return { command: interp, prefixArgs: [resolved] };
    }
  }
  return { command: path, prefixArgs: [] };
}

export async function resolveKeshaBin(
  preference: string | undefined,
  deps: KeshaBinDeps = {},
): Promise<KeshaSpawn | null> {
  const resolved = withDefaults(deps);
  const trimmed = preference?.trim();
  if (trimmed) {
    return buildSpawn(trimmed, resolved);
  }
  for (const candidate of resolved.candidates) {
    const spawn = await buildSpawn(candidate, resolved);
    if (spawn) {
      return spawn;
    }
  }
  return null;
}

export interface ProbeDeps {
  execFile?: (
    command: string,
    args: string[],
    options: { timeout: number },
  ) => Promise<{ stdout: string; stderr: string }>;
}

export interface EnginePreflightResult {
  ok: boolean;
  hint?: string;
}

function runKesha(spawn: KeshaSpawn, verb: string, deps: ProbeDeps) {
  const run = deps.execFile ?? execFileAsync;
  return run(spawn.command, [...spawn.prefixArgs, verb], {
    timeout: PROBE_TIMEOUT_MS,
  });
}

export async function probeKeshaVersion(
  spawn: KeshaSpawn,
  deps: ProbeDeps = {},
): Promise<string | null> {
  try {
    const { stdout } = await runKesha(spawn, "--version", deps);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// `kesha status` marks a missing engine as "not installed" on stdout and warns
// on stderr with the exact remaining setup command (`installHint()`). Keying
// off the stdout marker keeps unrelated stderr (KESHA_DEBUG traces, warnings)
// from failing a healthy install; a probe that cannot run at all fails open —
// the CLI's own guards report the real problem with a better message.
export async function probeEngineAvailability(
  spawn: KeshaSpawn,
  deps: ProbeDeps = {},
): Promise<EnginePreflightResult> {
  try {
    const { stdout, stderr } = await runKesha(spawn, "status", deps);
    if (!stdout.includes("not installed")) return { ok: true };
    return { ok: false, hint: stderr.trim() || undefined };
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr?: unknown }).stderr ?? "").trim()
        : "";
    if (stderr.includes("kesha install")) return { ok: false, hint: stderr };
    return { ok: true };
  }
}

export function notFoundMessage(): string {
  return [
    "kesha CLI not found. Finish setup:",
    "1. Install the CLI — `brew install drakulavich/tap/kesha-voice-kit` (or `bun add -g @drakulavich/kesha-voice-kit`).",
    "2. Run `kesha install` to download the engine and models.",
    `Already installed? Set the "Kesha Binary Path" preference to an absolute path. Probed: ${FALLBACK_CANDIDATES.join(", ")}`,
  ].join("\n");
}
