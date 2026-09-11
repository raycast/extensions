import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";
import { readClaudeConfig, writeClaudeConfig } from "../utils/config";

interface AddMcpServerFormProps {
  onSuccess: () => void;
}

export default function AddMcpServerForm({ onSuccess }: AddMcpServerFormProps) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [commandError, setCommandError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    command: string;
    args: string;
    env: string;
    transportType: string;
    url: string;
    disabled: boolean;
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }

    if (!values.command.trim() && values.transportType === "stdio") {
      setCommandError("Command is required for stdio transport");
      return;
    }

    try {
      const config = await readClaudeConfig(preferences.configPath || undefined);
      const mcpServers = { ...(config.mcpServers || {}) };

      // Check if server name already exists
      if (mcpServers[values.name]) {
        setNameError("A server with this name already exists");
        return;
      }

      // Parse args and env
      const args = values.args
        .split("\n")
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      const env: Record<string, string> = {};
      if (values.env) {
        values.env.split("\n").forEach((line) => {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join("=").trim();
          }
        });
      }

      mcpServers[values.name] = {
        command: values.command,
        args: args.length > 0 ? args : undefined,
        env: Object.keys(env).length > 0 ? env : undefined,
        transportType: values.transportType as "stdio" | "http" | "sse",
        url: values.url || undefined,
        disabled: values.disabled,
      };

      await writeClaudeConfig(
        {
          ...config,
          mcpServers,
        },
        preferences.configPath || undefined
      );

      showToast({
        style: Toast.Style.Success,
        title: "Server Added",
        message: `Added ${values.name}`,
      });

      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add server",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Server" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Server Name"
        placeholder="my-mcp-server"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Dropdown id="transportType" title="Transport Type" defaultValue="stdio">
        <Form.Dropdown.Item value="stdio" title="STDIO" />
        <Form.Dropdown.Item value="http" title="HTTP" />
        <Form.Dropdown.Item value="sse" title="SSE" />
      </Form.Dropdown>
      <Form.TextField
        id="command"
        title="Command"
        placeholder="node"
        error={commandError}
        onChange={() => setCommandError(undefined)}
      />
      <Form.TextArea
        id="args"
        title="Arguments"
        placeholder="One argument per line&#10;/path/to/server.js&#10;--port=3000"
      />
      <Form.TextArea id="url" title="URL" placeholder="http://localhost:3000 (for HTTP/SSE transport)" />
      <Form.TextArea
        id="env"
        title="Environment Variables"
        placeholder="KEY=value (one per line)&#10;API_KEY=sk-...&#10;DEBUG=true"
      />
      <Form.Checkbox id="disabled" title="Status" label="Start disabled" defaultValue={false} />
    </Form>
  );
}
