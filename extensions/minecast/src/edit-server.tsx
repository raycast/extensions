import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  useNavigation,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { Server } from "./types";
import { useState } from "react";

interface FormValues {
  name: string;
  ip: string;
  port: string;
  type: string;
}

export default function EditServer({
  server,
  onEdit,
}: {
  server: Server;
  onEdit: () => void;
}) {
  const { pop } = useNavigation();
  const [ipError, setIpError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.ip) {
      setIpError("The field is required!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating server...",
    });

    try {
      const serverType = values.type as "java" | "bedrock";
      let port = parseInt(values.port);
      let ip = values.ip;

      // Extract port from IP if present (e.g., ip:port or [IPv6]:port)
      if (ip.startsWith("[")) {
        // [IPv6]:port format
        const match = ip.match(/^\[(.+)\](?::(\d+))?$/);
        if (match) {
          ip = match[1];
          if (match[2]) {
            const extractedPort = parseInt(match[2]);
            if (!isNaN(extractedPort)) {
              port = extractedPort;
            }
          }
        }
      } else if (ip.includes(":")) {
        // Could be host:port or bare IPv6 — only split on last colon
        const lastColon = ip.lastIndexOf(":");
        const possiblePort = parseInt(ip.slice(lastColon + 1));
        if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
          port = possiblePort;
          ip = ip.slice(0, lastColon);
        }
        // If port is not valid, assume it's a bare IPv6 address and don't split
      }

      if (isNaN(port)) {
        // Default ports if not specified or invalid
        port = serverType === "java" ? 25565 : 19132;
      } else if (port < 1 || port > 65535) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid port";
        toast.message = "Port must be between 1 and 65535.";
        return;
      }

      const updatedServer: Server = {
        ...server,
        name: values.name || ip,
        ip: ip,
        port: port,
        type: serverType,
      };

      const storedServers = await LocalStorage.getItem<string>("servers");
      if (storedServers) {
        const servers: Server[] = JSON.parse(storedServers);
        const index = servers.findIndex((s) => s.id === server.id);
        if (index !== -1) {
          servers[index] = updatedServer;
          await LocalStorage.setItem("servers", JSON.stringify(servers));
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = "Server updated!";

      onEdit();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update server";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Server"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="Server Address"
        placeholder="mc.hypixel.net"
        defaultValue={server.ip}
        error={ipError}
        onChange={() => setIpError(undefined)}
      />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="Optional"
        defaultValue={server.port.toString()}
      />
      <Form.Dropdown id="type" title="Type" defaultValue={server.type}>
        <Form.Dropdown.Item value="java" title="Java Edition" />
        <Form.Dropdown.Item value="bedrock" title="Bedrock Edition" />
      </Form.Dropdown>
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Favorite Server (Optional)"
        defaultValue={server.name}
      />
    </Form>
  );
}
