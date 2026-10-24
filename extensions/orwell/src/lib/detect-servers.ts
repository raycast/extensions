import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolveProject } from "./resolve-project";
import { resolveFavicon } from "./favicon";
import { resolveStartCommand } from "./actions";
import { loadRegistry, upsertEntry } from "./registry";
import type { DevServer } from "./types";

const execAsync = promisify(exec);

const NODE_COMMANDS = new Set(["node", "tsx", "ts-node", "bun", "deno"]);

let selfPort: number | null = null;
export function setSelfPort(port: number) {
  selfPort = port;
}

interface RawListener {
  pid: number;
  port: number;
  command: string;
}

export async function detectServers(): Promise<DevServer[]> {
  const listeners = await getListeners();
  const onlineServers: DevServer[] = [];
  const onlineDirs = new Set<string>();

  await Promise.all(
    listeners.map(async (listener) => {
      try {
        const cwd = await getCwd(listener.pid);
        if (!cwd) return;

        const fullCommand = await getFullCommand(listener.pid);
        const project = await resolveProject(cwd, fullCommand);
        const faviconPath = await resolveFavicon(project.projectDir, listener.port);
        const startCommand = await resolveStartCommand(project.projectDir, fullCommand);

        onlineDirs.add(project.projectDir);

        // Update registry with this running server
        await upsertEntry({
          projectDir: project.projectDir,
          projectName: project.projectName,
          framework: project.framework,
          lastPort: listener.port,
          startCommand,
          lastSeen: new Date().toISOString(),
        });

        onlineServers.push({
          pid: listener.pid,
          port: listener.port,
          projectName: project.projectName,
          projectDir: project.projectDir,
          command: fullCommand || listener.command,
          framework: project.framework,
          faviconPath,
          url: `http://localhost:${listener.port}`,
          status: "online",
        });
      } catch {
        // skip
      }
    }),
  );

  // Load registry and add offline entries
  const registry = await loadRegistry();
  const offlineServers: DevServer[] = [];

  for (const entry of registry) {
    if (onlineDirs.has(entry.projectDir)) continue;

    const faviconPath = await resolveFavicon(entry.projectDir, entry.lastPort);

    offlineServers.push({
      pid: 0,
      port: entry.lastPort,
      projectName: entry.projectName,
      projectDir: entry.projectDir,
      command: entry.startCommand,
      framework: entry.framework,
      faviconPath,
      url: `http://localhost:${entry.lastPort}`,
      status: "offline",
    });
  }

  const all = [...onlineServers, ...offlineServers]
    .filter((s) => s.projectDir !== "/")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "online" ? -1 : 1;
      return a.port - b.port;
    });

  return all;
}

async function getListeners(): Promise<RawListener[]> {
  try {
    const { stdout } = await execAsync("/bin/sh -c '/usr/sbin/lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null'", {
      maxBuffer: 1024 * 1024,
    });

    const lines = stdout.trim().split("\n").slice(1);
    const seen = new Map<number, RawListener>();

    for (const line of lines) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 9) continue;

      const command = cols[0].toLowerCase();
      const pid = parseInt(cols[1], 10);

      if (!NODE_COMMANDS.has(command)) continue;

      const nameField = cols[cols.length - 2];
      const portMatch = nameField.match(/:(\d+)$/);
      if (!portMatch) continue;
      const port = parseInt(portMatch[1], 10);

      if (selfPort !== null && port === selfPort) continue;

      if (!seen.has(port)) {
        seen.set(port, { pid, port, command });
      }
    }

    return Array.from(seen.values());
  } catch {
    return [];
  }
}

async function getCwd(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`/usr/sbin/lsof -p ${pid} -F fn 2>/dev/null`);
    const lines = stdout.trim().split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "fcwd" && i + 1 < lines.length && lines[i + 1].startsWith("n")) {
        return lines[i + 1].slice(1);
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getFullCommand(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`/bin/ps -o command= -p ${pid}`);
    return stdout.trim();
  } catch {
    return "";
  }
}
