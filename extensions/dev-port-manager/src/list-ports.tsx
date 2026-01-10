import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
} from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";
import { homedir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);
const HOME = homedir();

interface Preferences {
  ignoredProcesses: string;
  customDockerSocket: string;
}

type ProcessCategory =
  | "docker"
  | "database"
  | "tunnel"
  | "browser"
  | "worker"
  | "node"
  | "ssh"
  | "server"
  | "process";

interface DevProcess {
  id: string;
  port: string;
  name: string;
  project: string;
  command: string;
  type: "process" | "docker";
  category: ProcessCategory;
  warning?: string;
}

const CATEGORY_CONFIG: Record<
  ProcessCategory,
  { label: string; color: string }
> = {
  docker: { label: "Docker", color: "#0db7ed" },
  database: { label: "Database", color: "#336791" },
  tunnel: { label: "Tunnel", color: "#f97316" },
  browser: { label: "Browser", color: "#4285f4" },
  worker: { label: "Worker", color: "#f38020" },
  node: { label: "Node", color: "#68a063" },
  ssh: { label: "SSH", color: "#9333ea" },
  server: { label: "Server", color: "#06b6d4" },
  process: { label: "Process", color: "#4ade80" },
};

function detectCategory(command: string, isDocker: boolean): ProcessCategory {
  const cmd = command.toLowerCase();

  // Database
  if (
    /postgres|mysql|mariadb|redis|mongo|sqlite|cockroach|timescale|postgis/.test(
      cmd,
    )
  ) {
    return "database";
  }

  // Tunnel
  if (/ngrok|cloudflared|localtunnel|expose/.test(cmd)) {
    return "tunnel";
  }

  // Browser
  if (/chrome|google|safari|firefox|webkit|chromium|playwright/.test(cmd)) {
    return "browser";
  }

  // Worker (Cloudflare, etc.)
  if (/workerd|wrangler|miniflare/.test(cmd)) {
    return "worker";
  }

  // Node.js runtimes
  if (/^node$|deno|bun/.test(cmd)) {
    return "node";
  }

  // SSH
  if (cmd === "ssh") {
    return "ssh";
  }

  // Web servers
  if (/nginx|apache|caddy|httpd/.test(cmd)) {
    return "server";
  }

  // Docker container (only if not categorized above)
  if (isDocker) {
    return "docker";
  }

  return "process";
}

// Docker socket paths to try (in order of preference)
const DOCKER_SOCKET_PATHS = [
  `${HOME}/.colima/default/docker.sock`, // Colima
  `${HOME}/.docker/run/docker.sock`, // Docker Desktop (newer)
  "/var/run/docker.sock", // Docker Desktop / Linux
  `${HOME}/.local/share/containers/podman/podman.sock`, // Podman
  `${HOME}/.rd/docker.sock`, // Rancher Desktop
];

// Docker binary paths to try (Raycast has minimal PATH)
const DOCKER_BINARY_PATHS = [
  "/opt/homebrew/bin/docker", // Homebrew on Apple Silicon
  "/usr/local/bin/docker", // Homebrew on Intel / Docker Desktop
  "/usr/bin/docker", // System install / Linux
];

function getDockerBinary(): string | null {
  for (const path of DOCKER_BINARY_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

function getDockerHost(): string | null {
  const prefs = getPreferenceValues<Preferences>();

  // Custom socket path from preferences
  if (prefs.customDockerSocket && existsSync(prefs.customDockerSocket)) {
    return `unix://${prefs.customDockerSocket}`;
  }

  // Environment variable
  if (process.env.DOCKER_HOST) {
    return process.env.DOCKER_HOST;
  }

  // Auto-detect
  for (const path of DOCKER_SOCKET_PATHS) {
    if (existsSync(path)) {
      return `unix://${path}`;
    }
  }

  return null;
}

function findProjectRoot(cwd: string): { root: string; name: string } | null {
  // Walk up the directory tree to find project root (.git)
  let dir = cwd;
  while (dir && dir !== "/" && dir.length > 1) {
    if (existsSync(`${dir}/.git`)) {
      return { root: dir, name: dir.split("/").pop() || "" };
    }
    dir = dir.split("/").slice(0, -1).join("/");
  }
  return null;
}

function getDisplayPath(cwd: string): { project: string; path: string } {
  // Find project root and show path relative to it
  const projectInfo = findProjectRoot(cwd);

  if (projectInfo) {
    const relativePath = cwd.slice(projectInfo.root.length + 1); // +1 for trailing slash
    const displayPath = relativePath
      ? `${projectInfo.name}/${relativePath}`
      : projectInfo.name;
    return { project: projectInfo.name, path: displayPath };
  }

  // Fallback: just show folder name
  const folderName = cwd.split("/").pop() || cwd;
  return { project: folderName, path: folderName };
}

function getIgnoredProcesses(): string[] {
  const prefs = getPreferenceValues<Preferences>();
  const defaults = [
    "rapportd",
    "Raycast",
    "syncthing",
    "limactl",
    "Code Helper",
    "Code\\x20H",
    "ssh",
    "node_modules",
  ];

  if (prefs.ignoredProcesses) {
    const custom = prefs.ignoredProcesses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return [...defaults, ...custom];
  }

  return defaults;
}

async function getProcesses(): Promise<DevProcess[]> {
  const processes: DevProcess[] = [];
  const ignoredCommands = getIgnoredProcesses();

  // Get system processes
  try {
    const { stdout: lsofOutput } = await execAsync(
      "/usr/sbin/lsof -iTCP -sTCP:LISTEN -P 2>/dev/null || true",
    );
    const lines = lsofOutput.trim().split("\n").slice(1);
    const seenPids = new Set<string>();

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const command = parts[0];
      const pid = parts[1];
      const port = parts[8] || parts[9] || "";

      if (seenPids.has(pid)) continue;
      if (
        ignoredCommands.some((ic) =>
          command.toLowerCase().includes(ic.toLowerCase()),
        )
      )
        continue;
      seenPids.add(pid);

      try {
        // Get working directory to determine project name
        const { stdout: cwdOutput } = await execAsync(
          `/usr/sbin/lsof -p ${pid} 2>/dev/null | /usr/bin/awk '$4=="cwd" {print $9}'`,
        );
        const cwd = cwdOutput.trim();

        // Skip Raycast-related processes and system processes with root cwd
        if (
          cwd.includes("Raycast") ||
          cwd.includes("com.raycast") ||
          cwd === "/" ||
          cwd === ""
        ) {
          continue;
        }

        // Show folder hierarchy for context
        const { project, path } = getDisplayPath(cwd);
        const category = detectCategory(command, false);

        processes.push({
          id: pid,
          port,
          name: path,
          project,
          command,
          type: "process",
          category,
        });
      } catch {
        // Skip processes where we can't get cwd (likely system processes)
      }
    }
  } catch {
    // lsof may fail if no listening processes
  }

  // Get Docker containers
  const dockerHost = getDockerHost();
  const dockerBinary = getDockerBinary();
  if (dockerHost && dockerBinary) {
    try {
      const dockerEnv = `DOCKER_HOST="${dockerHost}"`;
      // Get container info with compose labels for project path
      const { stdout: dockerOutput } = await execAsync(
        `${dockerEnv} ${dockerBinary} ps --format '{{.ID}}|{{.Names}}|{{.Ports}}|{{.Image}}|{{.Label "com.docker.compose.project.working_dir"}}|{{.Label "com.docker.compose.service"}}' 2>/dev/null`,
      );
      const lines = dockerOutput.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const [id, containerName, ports, image, workingDir, service] =
          line.split("|");
        if (!id) continue;

        // Parse port info (e.g., 0.0.0.0:3000->3000/tcp)
        const portMatch = ports.match(/0\.0\.0\.0:(\d+)/);
        const port = portMatch ? `:${portMatch[1]}` : ports || "no port";

        // Use project path if available, otherwise container name
        let name = containerName;
        let project = containerName.split("-")[0]; // fallback: first part of container name

        if (workingDir) {
          const pathInfo = getDisplayPath(workingDir);
          project = pathInfo.project;
          name = service ? `${pathInfo.path}/${service}` : pathInfo.path;
        }

        // Detect category from image name (e.g., postgres:17, redis:latest)
        const category = detectCategory(image, true);

        processes.push({
          id,
          port,
          name,
          project,
          command: image,
          type: "docker",
          category,
        });
      }
    } catch {
      // Docker may not be available
    }
  }

  return processes;
}

async function killProcess(proc: DevProcess): Promise<boolean> {
  try {
    if (proc.type === "docker") {
      const dockerHost = getDockerHost();
      const dockerBinary = getDockerBinary();
      if (!dockerHost || !dockerBinary) throw new Error("Docker not available");
      await execAsync(
        `DOCKER_HOST="${dockerHost}" ${dockerBinary} stop ${proc.id}`,
      );
    } else {
      await execAsync(`kill -9 ${proc.id}`);
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Stopped ${proc.name}`,
    });
    return true;
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to stop ${proc.name}`,
    });
    return false;
  }
}

async function killAllExcept(
  keepName: string,
  processes: DevProcess[],
): Promise<void> {
  const toKill = processes.filter((p) => p.name !== keepName);

  if (toKill.length === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "No other processes to stop",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Stop ${toKill.length} processes?`,
    message: `Keep: ${keepName}\nStop: ${toKill.map((p) => p.name).join(", ")}`,
    primaryAction: { title: "Stop All", style: Alert.ActionStyle.Destructive },
  });

  if (confirmed) {
    for (const p of toKill) {
      await killProcess(p).catch(() => {});
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Stopped ${toKill.length} processes`,
    });
  }
}

function detectWarnings(processes: DevProcess[]): DevProcess[] {
  // Extract port numbers and detect conflicts
  const portMap = new Map<string, DevProcess[]>();

  for (const proc of processes) {
    // Extract port number from port string (e.g., ":3000" -> "3000", "localhost:3000" -> "3000")
    const portMatch = proc.port.match(/:?(\d+)/);
    if (portMatch) {
      const portNum = portMatch[1];
      if (!portMap.has(portNum)) {
        portMap.set(portNum, []);
      }
      portMap.get(portNum)!.push(proc);
    }
  }

  // Mark conflicting processes
  for (const [portNum, procs] of portMap) {
    if (procs.length > 1) {
      // Check if it's Docker + ssh forwarding (expected) vs actual conflict
      const hasDocker = procs.some((p) => p.type === "docker");
      const hasSsh = procs.some((p) => p.command === "ssh");

      if (hasDocker && hasSsh && procs.length === 2) {
        // Docker + ssh is normal for Colima, no warning needed
        continue;
      }

      // Real conflict - mark all processes on this port
      for (const proc of procs) {
        proc.warning = `Port ${portNum} conflict (${procs.length} processes)`;
      }
    }
  }

  return processes;
}

async function killAllInProject(
  projectName: string,
  processes: DevProcess[],
): Promise<void> {
  const toKill = processes.filter((p) => p.project === projectName);

  if (toKill.length === 0) {
    await showToast({
      style: Toast.Style.Success,
      title: "No processes in this project",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Stop all in "${projectName}"?`,
    message: `Stop: ${toKill.map((p) => p.name).join(", ")}`,
    primaryAction: {
      title: `Stop ${toKill.length} processes`,
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (confirmed) {
    for (const p of toKill) {
      await killProcess(p).catch(() => {});
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Stopped ${toKill.length} processes in ${projectName}`,
    });
  }
}

export default function Command() {
  const [processes, setProcesses] = useState<DevProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProcesses = async () => {
    setIsLoading(true);
    const procs = await getProcesses();
    const procsWithWarnings = detectWarnings(procs);
    setProcesses(procsWithWarnings);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  // Group processes by project
  const groupedProcesses = processes.reduce(
    (acc, proc) => {
      if (!acc[proc.project]) {
        acc[proc.project] = [];
      }
      acc[proc.project].push(proc);
      return acc;
    },
    {} as Record<string, DevProcess[]>,
  );

  const projectNames = Object.keys(groupedProcesses).sort();

  // Find conflicting processes
  const conflictingProcesses = processes.filter((p) => p.warning);

  return (
    <List isLoading={isLoading}>
      {processes.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No dev servers running"
          description="Start a development server or Docker container to see it here"
          icon={Icon.CheckCircle}
        />
      ) : (
        <>
          {conflictingProcesses.length > 0 && (
            <List.Section
              title="⚠️ Port Conflicts"
              subtitle="These processes may interfere with each other"
            >
              {conflictingProcesses.map((proc) => (
                <List.Item
                  key={`conflict-${proc.type}-${proc.id}`}
                  icon={Icon.ExclamationMark}
                  title={proc.name}
                  subtitle={`${proc.port} - ${proc.warning}`}
                  accessories={[
                    { tag: { value: "Conflict", color: "#ef4444" } },
                    {
                      tag: {
                        value: CATEGORY_CONFIG[proc.category].label,
                        color: CATEGORY_CONFIG[proc.category].color,
                      },
                    },
                    { text: proc.command },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={
                          proc.type === "docker"
                            ? "Stop Container"
                            : "Kill Process"
                        }
                        icon={Icon.Stop}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const success = await killProcess(proc);
                          if (success) loadProcesses();
                        }}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadProcesses}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {projectNames.map((projectName) => (
            <List.Section key={projectName} title={projectName}>
              <List.Item
                key={`section-${projectName}`}
                icon={Icon.Folder}
                title={`Stop all in ${projectName}`}
                subtitle={`${groupedProcesses[projectName].length} processes`}
                accessories={[{ tag: { value: "Project", color: "#f59e0b" } }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Stop All in "${projectName}"`}
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await killAllInProject(projectName, processes);
                        loadProcesses();
                      }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadProcesses}
                    />
                  </ActionPanel>
                }
              />
              {groupedProcesses[projectName].map((proc) => (
                <List.Item
                  key={`${proc.type}-${proc.id}`}
                  icon={
                    proc.warning
                      ? Icon.ExclamationMark
                      : proc.type === "docker"
                        ? Icon.Box
                        : Icon.Terminal
                  }
                  title={`  └ ${proc.name}`}
                  subtitle={proc.port}
                  accessories={[
                    ...(proc.warning
                      ? [{ tag: { value: "Conflict", color: "#ef4444" } }]
                      : []),
                    {
                      tag: {
                        value: CATEGORY_CONFIG[proc.category].label,
                        color: CATEGORY_CONFIG[proc.category].color,
                      },
                    },
                    { text: proc.command },
                    {
                      text:
                        proc.type === "docker"
                          ? proc.id.slice(0, 8)
                          : `PID ${proc.id}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={
                          proc.type === "docker"
                            ? "Stop Container"
                            : "Kill Process"
                        }
                        icon={Icon.Stop}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const success = await killProcess(proc);
                          if (success) loadProcesses();
                        }}
                      />
                      <Action
                        title="Stop All Except This"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                        onAction={async () => {
                          await killAllExcept(proc.name, processes);
                          loadProcesses();
                        }}
                      />
                      <Action
                        title={`Stop All in "${proc.project}"`}
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        onAction={async () => {
                          await killAllInProject(proc.project, processes);
                          loadProcesses();
                        }}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={loadProcesses}
                      />
                      <Action.CopyToClipboard
                        title="Copy Port"
                        content={proc.port.replace(":", "")}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}
