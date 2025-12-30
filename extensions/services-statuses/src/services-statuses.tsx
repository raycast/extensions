import { List, Detail, LocalStorage, showToast, Toast, Image, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { ServerConfig, ServerStatus, PM2Process, HealthCheck } from "./types";
import { ServerDetailMetadata } from "./components/ServerDetailMetadata";
import { ServerDetailActions } from "./components/ServerDetailActions";
import { generateServerDetailMarkdown } from "./components/ServerDetailMarkdown";

const execAsync = promisify(exec);

const STORAGE_KEY = "server-configs";
const CACHE_KEY = "server-statuses-cache";
const CACHE_TIMESTAMP_KEY = "server-statuses-cache-timestamp";
const CACHE_DURATION = 30 * 1000; // 30 seconds

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

async function loadCachedStatuses(): Promise<ServerStatus[] | null> {
  try {
    const cacheData = await LocalStorage.getItem(CACHE_KEY);
    const timestampData = await LocalStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (typeof cacheData === "string" && typeof timestampData === "string") {
      const timestamp = parseInt(timestampData);
      const now = Date.now();

      // Return cached data if it's less than CACHE_DURATION old
      if (now - timestamp < CACHE_DURATION) {
        return JSON.parse(cacheData);
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

async function saveCachedStatuses(statuses: ServerStatus[]): Promise<void> {
  try {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(statuses));
    await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore cache errors
  }
}

async function checkHttpHealth(url: string): Promise<HealthCheck> {
  try {
    const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}"`);
    const httpCode = parseInt(stdout.trim());

    // Consider 2xx and 3xx as healthy
    if (httpCode >= 200 && httpCode < 400) {
      return { status: "healthy", httpCode };
    } else {
      return { status: "unhealthy", httpCode, error: `HTTP ${httpCode}` };
    }
  } catch (err) {
    return {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

async function checkServerStatus(server: ServerConfig): Promise<ServerStatus> {
  const result: ServerStatus = {
    server,
    processes: [],
  };

  // Check PM2 services if SSH is configured
  try {
    const sshUser = server.user || "root";
    const sshPort = server.port || 22;

    // Use SSH with default key resolution (works with existing SSH configurations)
    const sshCommand = `ssh -p ${sshPort} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${sshUser}@${server.host} "pm2 jlist"`;

    const { stdout } = await execAsync(sshCommand);
    const processes: PM2Process[] = JSON.parse(stdout);

    // Filter processes if specific services are configured
    let filteredProcesses = processes;
    if (server.services && server.services.length > 0) {
      filteredProcesses = processes.filter((p) => server.services!.includes(p.name));
    }

    result.processes = filteredProcesses;
  } catch (err) {
    let errorMessage = err instanceof Error ? err.message : String(err);

    // Only set error if PM2 check fails AND no health check URL is configured
    // (WordPress servers might not have PM2)
    if (!server.healthCheckUrl) {
      // Provide helpful error messages
      if (errorMessage.includes("Permission denied")) {
        errorMessage =
          "SSH key authentication failed. Make sure the SSH public key is added to the server's authorized_keys file.";
      } else if (errorMessage.includes("Could not resolve hostname") || errorMessage.includes("Connection refused")) {
        errorMessage = `Unable to connect to ${server.host}. Check that the server is reachable and SSH is running.`;
      } else if (errorMessage.includes("command not found") || errorMessage.includes("pm2: command not found")) {
        errorMessage = "PM2 is not installed on this server. Consider adding a Health Check URL instead.";
      }

      result.error = errorMessage;
    }
  }

  // Check HTTP health if URL is configured
  if (server.healthCheckUrl) {
    result.healthCheck = await checkHttpHealth(server.healthCheckUrl);
  }

  return result;
}

export default function Command() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerConfig | null>(null);
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      const loadedServers = await loadServers();
      setServers(loadedServers);

      if (loadedServers.length > 0) {
        // Try to load cached statuses first
        const cachedStatuses = await loadCachedStatuses();

        if (cachedStatuses) {
          // Show cached data immediately
          setServerStatuses(cachedStatuses);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        // Always fetch fresh data in the background
        Promise.all(loadedServers.map((server) => checkServerStatus(server)))
          .then((freshStatuses) => {
            setServerStatuses(freshStatuses);
            saveCachedStatuses(freshStatuses);
            setIsLoading(false);
          })
          .catch(() => {
            if (!cachedStatuses) {
              setServerStatuses([]);
            }
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Set default to first project if not set and projects exist
  useEffect(() => {
    const grouped = serverStatuses.reduce(
      (acc, status) => {
        const project = status.server.project || "Ungrouped";
        if (!acc[project]) {
          acc[project] = [];
        }
        acc[project].push(status);
        return acc;
      },
      {} as Record<string, typeof serverStatuses>,
    );
    const names = Object.keys(grouped).sort();
    if (names.length > 0 && !selectedProject) {
      setSelectedProject(names[0]);
    }
  }, [serverStatuses.length, selectedProject]);

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
      saveCachedStatuses(statuses);
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

  if (selectedServer && serverStatuses.length > 0) {
    const status = serverStatuses.find((s) => s.server.id === selectedServer.id);
    if (status) {
      // Determine overall health
      const healthyCount = status.processes.filter((p: PM2Process) => p.pm2_env.status === "online").length;
      const totalCount = status.processes.length;
      const pm2Healthy = totalCount === 0 || (totalCount > 0 && healthyCount === totalCount);
      const httpHealthy = !status.healthCheck || status.healthCheck.status === "healthy";
      const isHealthy = !status.error && pm2Healthy && httpHealthy;

      // Calculate total memory and CPU
      const totalMemory = status.processes.reduce((sum, p) => sum + (p.monit?.memory || 0), 0) / 1024 / 1024;
      const totalCPU = status.processes.reduce((sum, p) => sum + (p.monit?.cpu || 0), 0);
      const totalRestarts = status.processes.reduce((sum, p) => sum + (p.pm2_env.restart_time || 0), 0);

      const markdown = generateServerDetailMarkdown({ server: selectedServer, status });

      return (
        <Detail
          navigationTitle={selectedServer.name}
          markdown={markdown}
          metadata={
            <ServerDetailMetadata
              server={selectedServer}
              status={status}
              isHealthy={isHealthy}
              healthyCount={healthyCount}
              totalCount={totalCount}
              totalMemory={totalMemory}
              totalCPU={totalCPU}
              totalRestarts={totalRestarts}
            />
          }
          actions={
            <ServerDetailActions
              server={selectedServer}
              onBack={() => setSelectedServer(null)}
              onRefresh={refreshStatuses}
            />
          }
        />
      );
    }
  }

  if (servers.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Servers Configured"
          description="Use the 'Manage Servers' command from the command palette to add a server to monitor."
        />
      </List>
    );
  }

  // Group servers by project
  const groupedServers = serverStatuses.reduce(
    (acc, status) => {
      const project = status.server.project || "Ungrouped";
      if (!acc[project]) {
        acc[project] = [];
      }
      acc[project].push(status);
      return acc;
    },
    {} as Record<string, typeof serverStatuses>,
  );

  const projectNames = Object.keys(groupedServers).sort();
  const allProjects = ["All Projects", ...projectNames];

  // Filter projects based on selection
  // Default to first project if nothing selected, otherwise use selected or all
  const effectiveProject = selectedProject || (projectNames.length > 0 ? projectNames[0] : "All Projects");
  const filteredProjectNames = effectiveProject === "All Projects" ? projectNames : [effectiveProject];

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Project"
          value={effectiveProject}
          onChange={(newValue) => setSelectedProject(newValue)}
        >
          {allProjects.map((project) => (
            <List.Dropdown.Item key={project} title={project} value={project} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredProjectNames.map((projectName) => (
        <List.Section key={projectName} title={projectName}>
          {groupedServers[projectName].map((status) => {
            const healthyCount = status.processes.filter((p: PM2Process) => p.pm2_env.status === "online").length;
            const totalCount = status.processes.length;

            // Determine health: PM2 services must be healthy, and HTTP health check (if configured) must be healthy
            const pm2Healthy = totalCount === 0 || (totalCount > 0 && healthyCount === totalCount);
            const httpHealthy = !status.healthCheck || status.healthCheck.status === "healthy";
            const isHealthy = !status.error && pm2Healthy && httpHealthy;

            // Minimal subtitle - just the essential info
            let subtitle = "";
            if (status.healthCheck && totalCount === 0) {
              subtitle = `HTTP ${status.healthCheck.httpCode || ""}`;
            } else if (totalCount > 0) {
              subtitle = `${healthyCount}/${totalCount}`;
            } else if (status.server.host !== "N/A") {
              subtitle = status.server.host;
            }

            // Shield icon based on health status
            const shieldIcon: Image.ImageLike = {
              source: isHealthy ? "shield-check.svg" : "shield-x.svg",
            };

            return (
              <List.Item
                key={status.server.id}
                title={status.server.name}
                subtitle={subtitle}
                icon={shieldIcon}
                actions={
                  <ActionPanel>
                    <Action title="View Details" onAction={() => setSelectedServer(status.server)} />
                    <Action
                      title="Edit Server"
                      onAction={async () => {
                        // Store server ID in LocalStorage for the add-server command to read
                        await LocalStorage.setItem("editing-server-id", status.server.id);
                        // Use shell command to open Raycast with the manage-servers command
                        await execAsync(`open "raycast://extensions/yahya_tarique/services-statuses/add-server"`);
                        await popToRoot();
                      }}
                    />
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
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
