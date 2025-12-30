import { List, Detail, ActionPanel, Action, LocalStorage, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  services?: string[]; // Specific service names to track (empty = all)
}

interface PM2Process {
  name: string;
  pid: number;
  pm_id: number;
  status: string;
  pm2_env: {
    status: string;
    restart_time: number;
    uptime: number;
    pm_uptime: number;
  };
  monit: {
    cpu: number;
    memory: number;
  };
}

interface ServerStatus {
  server: ServerConfig;
  processes: PM2Process[];
  error?: string;
}

const STORAGE_KEY = "server-configs";

async function loadServers(): Promise<ServerConfig[]> {
  const data = await LocalStorage.getItem(STORAGE_KEY);
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

async function saveServers(servers: ServerConfig[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
}

async function checkServerStatus(server: ServerConfig): Promise<ServerStatus> {
  try {
    const sshUser = server.user || "root";
    const sshPort = server.port || 22;
    const sshKeyPath = `${process.env.HOME}/.ssh/voxta_server_key`;

    // Use SSH key-based authentication
    const sshCommand = `ssh -i ${sshKeyPath} -p ${sshPort} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${sshUser}@${server.host} "pm2 jlist"`;

    const { stdout } = await execAsync(sshCommand);
    const processes: PM2Process[] = JSON.parse(stdout);

    // Filter processes if specific services are configured
    let filteredProcesses = processes;
    if (server.services && server.services.length > 0) {
      filteredProcesses = processes.filter((p) => server.services!.includes(p.name));
    }

    return {
      server,
      processes: filteredProcesses,
    };
  } catch (err) {
    let errorMessage = err instanceof Error ? err.message : String(err);

    // Provide helpful error messages
    if (errorMessage.includes("Permission denied")) {
      errorMessage =
        "SSH key authentication failed. Make sure the SSH public key is added to the server's authorized_keys file.";
    } else if (errorMessage.includes("Could not resolve hostname") || errorMessage.includes("Connection refused")) {
      errorMessage = `Unable to connect to ${server.host}. Check that the server is reachable and SSH is running.`;
    }

    return {
      server,
      processes: [],
      error: errorMessage,
    };
  }
}

export default function Command() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerConfig | null>(null);
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadServers().then((loadedServers) => {
      setServers(loadedServers);
      if (loadedServers.length > 0) {
        setIsLoading(true);
        Promise.all(loadedServers.map((server) => checkServerStatus(server)))
          .then(setServerStatuses)
          .catch(() => setServerStatuses([]))
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const refreshStatuses = async () => {
    // Reload servers from storage in case new ones were added
    const currentServers = await loadServers();
    setServers(currentServers);

    if (currentServers.length === 0) {
      setServerStatuses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const statuses = await Promise.all(currentServers.map((server) => checkServerStatus(server)));
      setServerStatuses(statuses);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (selectedServer && serverStatuses.length > 0) {
    const status = serverStatuses.find((s) => s.server.id === selectedServer.id);
    if (status) {
      const markdown = status.error
        ? `# Error: ${selectedServer.name}\n\n\`\`\`\n${status.error}\n\`\`\`\n\n**Server:** ${selectedServer.host}\n**User:** ${selectedServer.user || "root"}`
        : `# ${selectedServer.name}\n\n**Server:** ${selectedServer.host}\n\n${
            status.processes.length === 0
              ? "No PM2 processes found."
              : status.processes
                  .map((proc: PM2Process) => {
                    const pm2Status = proc.pm2_env.status;
                    const icon = pm2Status === "online" ? "🟢" : pm2Status === "stopped" ? "🔴" : "⚠️";
                    const uptime = formatUptime(proc.pm2_env.uptime);
                    const cpu = proc.monit.cpu.toFixed(1);
                    const memory = (proc.monit.memory / 1024 / 1024).toFixed(2);

                    return `## ${icon} ${proc.name}

- **Status:** ${pm2Status}
- **PID:** ${proc.pid}
- **PM2 ID:** ${proc.pm_id}
- **Uptime:** ${uptime}
- **CPU:** ${cpu}%
- **Memory:** ${memory} MB
- **Restarts:** ${proc.pm2_env.restart_time}
`;
                  })
                  .join("\n")
          }\n\n---\n\n**Last updated:** ${new Date().toLocaleString()}`;

      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action title="Back" onAction={() => setSelectedServer(null)} />
              <Action title="Refresh" onAction={refreshStatuses} />
            </ActionPanel>
          }
        />
      );
    }
  }

  if (servers.length === 0) {
    return (
      <List actions={<ActionPanel></ActionPanel>}>
        <List.EmptyView
          title="No Servers Configured"
          description="Use the 'Add Server' command from the command palette to add a server to monitor."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={refreshStatuses} />
        </ActionPanel>
      }
    >
      {serverStatuses.map((status) => {
        const healthyCount = status.processes.filter((p: PM2Process) => p.pm2_env.status === "online").length;
        const totalCount = status.processes.length;
        const isHealthy = !status.error && totalCount > 0 && healthyCount === totalCount;

        const subtitle = status.error
          ? `Error: ${status.error.substring(0, 50)}${status.error.length > 50 ? "..." : ""}`
          : totalCount === 0
            ? "No processes"
            : `${healthyCount}/${totalCount} healthy`;

        return (
          <List.Item
            key={status.server.id}
            title={status.server.name}
            subtitle={subtitle}
            icon={status.error ? Icon.XMarkCircle : isHealthy ? Icon.CheckCircle : Icon.ExclamationMark}
            accessories={[
              { text: status.server.host },
              {
                icon: status.error
                  ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                  : isHealthy
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.ExclamationMark, tintColor: Color.Orange },
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="View Details" onAction={() => setSelectedServer(status.server)} />
                <Action
                  title="Delete Server"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    const updated = servers.filter((s) => s.id !== status.server.id);
                    await saveServers(updated);
                    setServers(updated);
                    setServerStatuses(serverStatuses.filter((s) => s.server.id !== status.server.id));
                  }}
                />
                <Action title="Refresh" onAction={refreshStatuses} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
