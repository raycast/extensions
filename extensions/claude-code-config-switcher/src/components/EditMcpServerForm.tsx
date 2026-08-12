import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";
import { McpServerConfig } from "../types";
import { readClaudeConfig, writeClaudeConfig } from "../utils/config";

interface EditMcpServerFormProps {
  serverName: string;
  config: McpServerConfig;
  onUpdate: () => void;
}

export default function EditMcpServerForm({ serverName, config, onUpdate }: EditMcpServerFormProps) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const [commandError, setCommandError] = useState<string | undefined>();

  // Format args and env for display
  const argsText = config.args?.join("\n") || "";
  const envText = config.env
    ? Object.entries(config.env)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n")
    : "";

  async function handleSubmit(values: {
    command: string;
    args: string;
    env: string;
    transportType: string;
    url: string;
    disabled: boolean;
  }) {
    if (!values.command.trim() && values.transportType === "stdio") {
      setCommandError("Command is required for stdio transport");
      return;
    }

    try {
      const claudeConfig = await readClaudeConfig(preferences.configPath || undefined);
      const mcpServers = { ...(claudeConfig.mcpServers || {}) };

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

      mcpServers[serverName] = {
        command: values.command,
        args: args.length > 0 ? args : undefined,
        env: Object.keys(env).length > 0 ? env : undefined,
        transportType: values.transportType as "stdio" | "http" | "sse",
        url: values.url || undefined,
        disabled: values.disabled,
      };

      await writeClaudeConfig(
        {
          ...claudeConfig,
          mcpServers,
        },
        preferences.configPath || undefined
      );

      showToast({
        style: Toast.Style.Success,
        title: "Server Updated",
        message: serverName,
      });

      onUpdate();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update server",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Server" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing: ${serverName}`} />
      <Form.Dropdown id="transportType" title="Transport Type" defaultValue={config.transportType || "stdio"}>
        <Form.Dropdown.Item value="stdio" title="STDIO" />
        <Form.Dropdown.Item value="http" title="HTTP" />
        <Form.Dropdown.Item value="sse" title="SSE" />
      </Form.Dropdown>
      <Form.TextField
        id="command"
        title="Command"
        placeholder="node"
        defaultValue={config.command}
        error={commandError}
        onChange={() => setCommandError(undefined)}
      />
      <Form.TextArea
        id="args"
        title="Arguments"
        placeholder="One argument per line&#10;/path/to/server.js&#10;--port=3000"
        defaultValue={argsText}
      />
      <Form.TextArea
        id="url"
        title="URL"
        placeholder="http://localhost:3000 (for HTTP/SSE transport)"
        defaultValue={config.url}
      />
      <Form.TextArea
        id="env"
        title="Environment Variables"
        placeholder="KEY=value (one per line)&#10;API_KEY=sk-...&#10;DEBUG=true"
        defaultValue={envText}
      />
      <Form.Checkbox id="disabled" title="Status" label="Disabled" defaultValue={config.disabled || false} />
    </Form>
  );
}
