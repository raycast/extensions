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
import { useState } from "react";
import { Server } from "./types";

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
  const [nameError, setNameError] = useState<string | undefined>();
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

      // Extract port from IP if present (e.g., ip:port)
      if (ip.includes(":")) {
        const parts = ip.split(":");
        ip = parts[0];
        const extractedPort = parseInt(parts[1]);
        if (!isNaN(extractedPort)) {
          port = extractedPort;
        }
      }

      if (isNaN(port)) {
        port = serverType === "java" ? 25565 : 19132;
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
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
}
