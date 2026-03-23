import { execa, ExecaChildProcess } from "execa";
import { Project, SyncDirection, SyncMode } from "./types";

export interface RsyncResult {
  output: string[];
  exitCode: number;
}

/**
 * Expands ~ to the actual home directory in a path string.
 * execa does not run through a shell, so ~ is not expanded automatically.
 */
function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return p.replace("~", process.env.HOME ?? "");
  }
  return p;
}

/**
 * Builds the rsync argument list for a given project + direction + mode.
 * Does NOT include the ssh binary path — relies on rsync finding ssh on PATH.
 */
export function buildRsyncArgs(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences,
): string[] {
  const port = prefs.ionosPort || "22";
  const sshArgs = prefs.sshKeyPath
    ? `ssh -p ${port} -i ${prefs.sshKeyPath} -o SendEnv=NOTHING`
    : `ssh -p ${port} -o SendEnv=NOTHING`;

  const args: string[] = ["-avzh", "--chmod=F644,D755", `-e`, sshArgs];

  if (mode === "dry") {
    args.push("--dry-run");
  }

  if (project.deleteOnSync && mode === "live") {
    args.push("--delete");
  }

  for (const ex of project.excludes) {
    args.push(`--exclude=${ex}`);
  }

  const local = expandHome(project.localPath) + "/";
  const remote = `${prefs.ionosUser}@${prefs.ionosHost}:${project.remotePath}/`;

  if (direction === "push") {
    args.push(local, remote);
  } else {
    args.push(remote, local);
  }

  return args;
}

/**
 * Runs rsync and returns a child process you can attach to for streaming.
 * The caller collects stdout/stderr lines and updates React state.
 */
export function spawnRsync(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences,
): ExecaChildProcess {
  const args = buildRsyncArgs(project, direction, mode, prefs);
  return execa("rsync", args, {
    all: true, // merge stdout + stderr into .all stream
    reject: false, // don't throw on non-zero exit — we handle it
    env: {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    },
  });
}

/**
 * Convenience wrapper: runs rsync and collects all output.
 * Calls onLine for each line so the UI can stream output incrementally.
 */
export async function runRsync(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences,
  onLine?: (line: string) => void,
): Promise<RsyncResult> {
  const child = spawnRsync(project, direction, mode, prefs);
  const lines: string[] = [];

  child.all?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split("\n")) {
      if (line.trim() && !line.includes("setlocale")) {
        lines.push(line);
        onLine?.(line);
      }
    }
  });

  const result = await child;
  return {
    output: lines,
    exitCode: result.exitCode ?? 1,
  };
}
