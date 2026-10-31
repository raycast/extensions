import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import type { ApplicationInfo, AppUsage, Counters, ProcessInfo } from "../types";

const execFileAsync = promisify(execFile);

export function parseProcesses(output: string): Map<number, ProcessInfo> {
  const processes = new Map<number, ProcessInfo>();
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\s+(.+)$/.exec(line);
    if (!match) throw new Error("Unable to read the macOS process list.");
    const [, pid, ppid, uid, startedAt, executable] = match;
    processes.set(Number(pid), { pid: Number(pid), ppid: Number(ppid), uid: Number(uid), startedAt, executable });
  }
  return processes;
}

export async function readProcesses(): Promise<Map<number, ProcessInfo>> {
  const { stdout } = await execFileAsync("/bin/ps", ["-axo", "pid=,ppid=,uid=,lstart=,comm="], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: 3000,
    env: { ...process.env, LC_ALL: "C" },
  });
  return parseProcesses(stdout);
}

export function outerAppPath(executable: string): string | null {
  if (!executable.startsWith("/")) return null;
  const match = /\.app(?:\/|$)/i.exec(executable);
  return match ? executable.slice(0, match.index + 4) : null;
}

type Attribution = Pick<AppUsage, "id" | "name" | "identity" | "isSystem" | "note">;

export function attributeProcess(
  row: Counters,
  processes: Map<number, ProcessInfo>,
  applications: Map<string, ApplicationInfo>,
  currentUid: number,
): Attribution {
  const process = processes.get(row.pid);
  const executable = process?.executable ?? row.name;
  const name = basename(executable);
  // These shared services have no reliable single-app owner, even when a parent happens to be an app.
  const shared = /com\.apple\.WebKit\.Networking/i.test(executable)
    ? "WebKit networking (Safari, Mail and others)"
    : /(?:^|\/)nsurlsessiond$/.test(executable)
      ? "Background downloads (nsurlsessiond)"
      : null;
  let candidate = process;
  const visited = new Set<number>();
  while (!shared && candidate && !visited.has(candidate.pid)) {
    visited.add(candidate.pid);
    const appPath = outerAppPath(candidate.executable);
    if (appPath) {
      const app = applications.get(appPath);
      const appName = app?.name ?? basename(appPath, ".app");
      return {
        id: appPath,
        name: appName,
        identity: { kind: "app", path: appPath, bundleId: app?.bundleId ?? null },
        isSystem: process?.uid !== currentUid || appPath.startsWith("/System/Library/"),
        note: /warp|tailscale|wireguard|vpn|little snitch|adguard|tripmode/i.test(appName)
          ? "VPNs and network filters may carry traffic for other apps. Their totals can overlap with app traffic."
          : null,
      };
    }
    const parent = processes.get(candidate.ppid);
    candidate = parent?.uid === process?.uid ? parent : undefined;
  }
  return {
    id: shared ? `shared:${name}` : `process:${executable}`,
    name: shared ?? name,
    identity: { kind: "process" },
    isSystem:
      !!shared || !process || process.uid !== currentUid || /^\/(?:System|usr\/libexec|usr\/sbin)\//.test(executable),
    note: shared
      ? "macOS shares this service across apps, so its traffic cannot be assigned to one app."
      : !process
        ? "This process exited before its app could be identified."
        : null,
  };
}

export function sameProcess(expected: ProcessInfo, current: ProcessInfo | undefined): boolean {
  return (
    !!current &&
    current.pid === expected.pid &&
    current.uid === expected.uid &&
    current.startedAt === expected.startedAt &&
    current.executable === expected.executable
  );
}

export function canQuitApp(app: AppUsage): boolean {
  return (
    app.identity.kind === "app" &&
    !app.isSystem &&
    app.processes.length > 0 &&
    !/^com\.raycast\./.test(app.identity.bundleId ?? "") &&
    !/\/Raycast(?:\.app|[^/]*\.app)$/.test(app.identity.path)
  );
}
