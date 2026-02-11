import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { Server } from "./types";
import { randomUUID } from "crypto";

interface FormValues {
  name: string;
  ip: string;
  port: string;
  type: string;
}

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [ipError, setIpError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.ip) {
      setIpError("The field is required!");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding server...",
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
        // Default ports if not specified or invalid
        port = serverType === "java" ? 25565 : 19132;
      }

      const newServer: Server = {
        id: randomUUID(),
        name: values.name || ip, // Use clean IP as default name
        ip: ip,
        port: port,
        type: serverType,
        createdAt: Date.now(),
      };

      const storedServers = await LocalStorage.getItem<string>("servers");
      const servers: Server[] = storedServers ? JSON.parse(storedServers) : [];
      servers.push(newServer);

      await LocalStorage.setItem("servers", JSON.stringify(servers));

      toast.style = Toast.Style.Success;
      toast.title = "Server added!";

      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add server";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Server" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="Server Address"
        placeholder="mc.hypixel.net"
        error={ipError}
        onChange={() => setIpError(undefined)}
      />
      <Form.TextField
        id="port"
        title="Port"
        placeholder="Optional (Default: 25565 for Java)"
      />
      <Form.Dropdown id="type" title="Type" defaultValue="java">
        <Form.Dropdown.Item value="java" title="Java Edition" />
        <Form.Dropdown.Item value="bedrock" title="Bedrock Edition" />
      </Form.Dropdown>
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Favorite Server (Optional)"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
    </Form>
  );
}
