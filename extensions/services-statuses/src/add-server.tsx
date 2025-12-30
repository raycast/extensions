import { Form, ActionPanel, Action, LocalStorage, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  services?: string[];
  healthCheckUrl?: string; // Optional HTTP health check URL (e.g., for WordPress sites)
  project?: string; // Optional project/group name
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

interface LaunchContext {
  serverId?: string;
}

export default function Command(props: { launchContext?: LaunchContext }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadServerData = async () => {
      // Check for server ID from launchContext or LocalStorage
      const editingServerId = props.launchContext?.serverId || (await LocalStorage.getItem("editing-server-id"));

      if (editingServerId && typeof editingServerId === "string") {
        const servers = await loadServers();
        const server = servers.find((s) => s.id === editingServerId);
        if (server) {
          setEditingServer(server);
          // Auto-show advanced if server has SSH config
          if (server.host && server.host !== "N/A") {
            setShowAdvanced(true);
          }
        }
        // Clear the editing server ID after loading
        await LocalStorage.removeItem("editing-server-id");
      }
      setIsLoading(false);
    };
    loadServerData();
  }, [props.launchContext?.serverId]);

  const handleSubmit = async (values: {
    name: string;
    host: string;
    user: string;
    port: string;
    services: string;
    healthCheckUrl: string;
    project: string;
    showAdvanced?: boolean;
  }) => {
    try {
      // Validate: need either host or healthCheckUrl
      // For editing HTTP-only servers, allow empty host if healthCheckUrl is provided
      const hasHost = values.host.trim() && values.host.trim() !== "N/A";
      const hasHealthCheck = values.healthCheckUrl.trim();

      if (!hasHost && !hasHealthCheck) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Please provide either a Host or Health Check URL",
        });
        return;
      }

      const servers = await loadServers();

      if (editingServer) {
        // Update existing server
        const updatedServers = servers.map((server) =>
          server.id === editingServer.id
            ? {
                ...server,
                name: values.name,
                // For HTTP-only servers, preserve "N/A" if no host is provided
                // Otherwise use the provided host or default to "N/A"
                host: hasHost ? values.host.trim() : "N/A",
                user: values.user || undefined,
                port: values.port ? parseInt(values.port) : undefined,
                services: values.services
                  ? values.services
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : undefined,
                healthCheckUrl: values.healthCheckUrl ? values.healthCheckUrl.trim() : undefined,
                project: values.project ? values.project.trim() : undefined,
              }
            : server,
        );
        await saveServers(updatedServers);
        // Clear editing server ID
        await LocalStorage.removeItem("editing-server-id");
        await showToast({
          style: Toast.Style.Success,
          title: "Server Updated",
          message: `${values.name} has been updated successfully`,
        });
      } else {
        // Create new server
        const newServer: ServerConfig = {
          id: Date.now().toString(),
          name: values.name,
          host: values.host.trim() || "N/A",
          user: values.user || undefined,
          port: values.port ? parseInt(values.port) : undefined,
          services: values.services
            ? values.services
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          healthCheckUrl: values.healthCheckUrl ? values.healthCheckUrl.trim() : undefined,
          project: values.project ? values.project.trim() : undefined,
        };
        await saveServers([...servers, newServer]);
        await showToast({
          style: Toast.Style.Success,
          title: "Server Added",
          message: `${newServer.name} has been added successfully`,
        });
      }
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: editingServer ? "Failed to update server" : "Failed to add server",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title={editingServer ? "Update Server" : "Add Server"} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={editingServer ? "Edit Server" : "Simple Config"}
        text={editingServer ? `Editing: ${editingServer.name}` : "Basic configuration for most use cases"}
      />
      <Form.TextField id="name" title="Name" placeholder="Production Server" defaultValue={editingServer?.name || ""} />
      <Form.TextField
        id="project"
        title="Project (Optional)"
        placeholder="Get Visa, AWS Services, etc."
        info="Group servers by project. Leave empty for ungrouped servers."
        defaultValue={editingServer?.project || ""}
      />
      <Form.TextField
        id="healthCheckUrl"
        title="Health Check URL"
        placeholder="https://example.vercel.app or https://dev.letsgetvisa.com"
        info="For Vercel deployments or web services. Leave empty if only monitoring PM2."
        defaultValue={editingServer?.healthCheckUrl || ""}
      />

      <Form.Separator />
      <Form.Checkbox
        id="showAdvanced"
        label="Show Advanced Config"
        defaultValue={showAdvanced}
        onChange={(value) => setShowAdvanced(value)}
      />

      {showAdvanced && (
        <>
          <Form.Description title="Advanced Config" text="SSH and PM2 monitoring settings" />
          <Form.TextField
            id="host"
            title="Host"
            placeholder="18.118.152.118"
            defaultValue={editingServer?.host && editingServer.host !== "N/A" ? editingServer.host : ""}
          />
          <Form.TextField
            id="user"
            title="SSH User"
            placeholder="ubuntu"
            defaultValue={editingServer?.user || "ubuntu"}
          />
          <Form.TextField
            id="port"
            title="SSH Port"
            placeholder="22"
            defaultValue={editingServer?.port?.toString() || "22"}
          />
          <Form.TextArea
            id="services"
            title="PM2 Services (Optional)"
            placeholder="service1, service2"
            info="Comma-separated list of PM2 service names. Leave empty to monitor all services."
            defaultValue={editingServer?.services?.join(", ") || ""}
          />
        </>
      )}
    </Form>
  );
}
