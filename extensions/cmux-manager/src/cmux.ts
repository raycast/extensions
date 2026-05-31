import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

interface Preferences {
  cmuxPath?: string;
  socketPath?: string;
}

// Candidate locations for the cmux CLI, in priority order.
// Note: the binary at .../MacOS/cmux is the GUI app, not the CLI — avoid it.
const CLI_CANDIDATES = [
  "/Applications/cmux.app/Contents/Resources/bin/cmux",
  "/usr/local/bin/cmux",
  "/opt/homebrew/bin/cmux",
];

// Where cmux records its live control socket. Pinning this avoids the CLI's
// auto-discovery, which scans environment-dependent paths ($TMPDIR, tagged
// sockets) and, under Raycast's stripped process environment, can connect to
// the wrong/dead socket — surfacing as "Failed to write to socket (Broken pipe)".
const SUPPORT_DIR = join(homedir(), "Library", "Application Support", "cmux");
const SOCKET_CANDIDATES = [
  join(SUPPORT_DIR, "cmux.sock"),
  // Files that contain the absolute path to the current socket.
  join(SUPPORT_DIR, "last-socket-path"),
  "/tmp/cmux-last-socket-path",
];

let cachedCliPath: string | undefined;

export function resolveCmuxPath(): string {
  const { cmuxPath } = getPreferenceValues<Preferences>();
  if (cmuxPath && cmuxPath.trim().length > 0) {
    return cmuxPath.trim();
  }
  if (cachedCliPath) {
    return cachedCliPath;
  }
  const found = CLI_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "Could not find the cmux CLI. Set the path in extension preferences (e.g. /Applications/cmux.app/Contents/Resources/bin/cmux).",
    );
  }
  cachedCliPath = found;
  return found;
}

// Returns the absolute socket path to pin via --socket, or undefined to let the
// CLI fall back to its own discovery.
function resolveSocketPath(): string | undefined {
  const { socketPath } = getPreferenceValues<Preferences>();
  if (socketPath && socketPath.trim().length > 0) {
    return socketPath.trim();
  }
  for (const candidate of SOCKET_CANDIDATES) {
    if (!existsSync(candidate)) continue;
    if (candidate.endsWith(".sock")) {
      return candidate;
    }
    // Pointer file: read the path it contains.
    try {
      const target = readFileSync(candidate, "utf8").trim();
      if (target && existsSync(target)) {
        return target;
      }
    } catch {
      // ignore and keep looking
    }
  }
  return undefined;
}

async function run(args: string[]): Promise<string> {
  const bin = resolveCmuxPath();
  const socket = resolveSocketPath();
  const fullArgs = socket ? ["--socket", socket, ...args] : args;

  const exec = async () => {
    const { stdout } = await execFileAsync(bin, fullArgs, {
      timeout: 15000,
      maxBuffer: 16 * 1024 * 1024,
      env: process.env,
    });
    return stdout;
  };

  try {
    return await exec();
  } catch (error) {
    const err = error as { stderr?: string; message?: string; code?: string };
    const detail = (err.stderr || err.message || "Unknown error").trim();
    // A broken pipe is transient (socket peer closed mid-write) — retry once.
    if (/broken pipe|EPIPE/i.test(detail)) {
      try {
        return await exec();
      } catch (retryError) {
        const re = retryError as { stderr?: string; message?: string };
        throw new Error((re.stderr || re.message || detail).trim());
      }
    }
    throw new Error(detail);
  }
}

export interface Workspace {
  ref: string;
  index: number;
  title: string;
  description: string | null;
  selected: boolean;
  currentDirectory: string | null;
  pinned: boolean;
}

interface RawWorkspace {
  ref: string;
  index: number;
  title?: string | null;
  description?: string | null;
  selected?: boolean;
  current_directory?: string | null;
  pinned?: boolean;
}

// Workspace titles can carry a leading status glyph (e.g. a braille spinner)
// plus whitespace — strip it for display.
function cleanTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title.replace(/^[^\p{L}\p{N}\p{P}]+/u, "").trim();
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const stdout = await run(["list-workspaces", "--json"]);
  const parsed = JSON.parse(stdout) as { workspaces?: RawWorkspace[] };
  const workspaces = parsed.workspaces ?? [];
  return workspaces.map((w) => ({
    ref: w.ref,
    index: w.index,
    title: cleanTitle(w.title) || w.ref,
    description: w.description ?? null,
    selected: Boolean(w.selected),
    currentDirectory: w.current_directory ?? null,
    pinned: Boolean(w.pinned),
  }));
}

export async function newWorkspace(opts: { name: string; cwd?: string }): Promise<void> {
  const args = ["new-workspace", "--name", opts.name, "--focus", "true"];
  if (opts.cwd && opts.cwd.trim().length > 0) {
    args.push("--cwd", opts.cwd.trim());
  }
  await run(args);
}

export async function selectWorkspace(ref: string): Promise<void> {
  await run(["select-workspace", "--workspace", ref]);
}

export async function renameWorkspace(ref: string, title: string): Promise<void> {
  await run(["rename-workspace", "--workspace", ref, title]);
}
