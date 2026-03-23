import { execa, ExecaChildProcess } from "execa";
import { Project, SyncDirection, SyncMode } from "./types";

export interface Preferences {
  ionosHost: string;
  ionosUser: string;
  ionosPort: string;
  sshKeyPath: string;
}

export interface RsyncResult {
  output: string[];
  exitCode: number;
}

function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return p.replace("~", process.env.HOME ?? "");
  }
  return p;
}

export function buildRsyncArgs(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences
): string[] {
  const port = prefs.ionosPort || "22";
  const sshArgs = prefs.sshKeyPath
    ? `ssh -p ${port} -i ${prefs.sshKeyPath}`
    : `ssh -p ${port}`;

  const args: string[] = ["-avzh", "--chmod=F644,D755", "-e", sshArgs];

  if (mode === "dry") args.push("--dry-run");
  if (project.deleteOnSync && mode === "live") args.push("--delete");
  for (const ex of project.excludes) args.push(`--exclude=${ex}`);

  const local = expandHome(project.localPath) + "/";
  const remote = `${prefs.ionosUser}@${prefs.ionosHost}:${project.remotePath}/`;

  if (direction === "push") {
    args.push(local, remote);
  } else {
    args.push(remote, local);
  }

  return args;
}

export function spawnRsync(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences
): ExecaChildProcess {
  const args = buildRsyncArgs(project, direction, mode, prefs);
  return execa("rsync", args, {
    all: true,
    reject: false,
    env: {
      ...process.env,
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
      LC_ALL: "C", // suppress locale warning from remote shell
    },
  });
}

export async function runRsync(
  project: Project,
  direction: SyncDirection,
  mode: SyncMode,
  prefs: Preferences,
  onLine?: (line: string) => void
): Promise<RsyncResult> {
  const child = spawnRsync(project, direction, mode, prefs);
  const lines: string[] = [];

  child.all?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split("\n")) {
      if (line.trim()) {
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
