import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { saveProfile } from "./utils/storage";
import { CreateProfileInput, MCPServerConfig } from "./types";

interface MCPServerFormData extends MCPServerConfig {
  name: string;
  envVars: string; // JSON string representation of env vars
}

interface CreateProfileFormData {
  name: string;
  description: string;
  servers: MCPServerFormData[];
}

export default function CreateProfile() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [servers, setServers] = useState<MCPServerFormData[]>([{ name: "", command: "", args: [], envVars: "" }]);

  const handleSubmit = async (values: CreateProfileFormData) => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Validate required fields
      if (!values.name?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Profile name is required",
        });
        return;
      }

      // Process server configurations
      const processedServers: { [key: string]: MCPServerConfig } = {};

      for (const server of servers) {
        if (!server.name?.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: "All servers must have a name",
          });
          return;
        }

        if (!server.command?.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: `Server "${server.name}" requires a command`,
          });
          return;
        }

        // Parse environment variables
        let env: Record<string, string> | undefined;
        if (server.envVars?.trim()) {
          try {
            env = JSON.parse(server.envVars);
            if (typeof env !== "object" || env === null) {
              throw new Error("Environment variables must be a valid JSON object");
            }
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Validation Error",
              message: `Invalid environment variables for server "${server.name}": ${error instanceof Error ? error.message : "Invalid JSON"}`,
            });
            return;
          }
        }

        // Parse args (split by whitespace, preserving quoted strings)
        const args = server.args || [];
        const processedArgs =
          typeof args === "string"
            ? (args as string).match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg: string) => arg.replace(/^"|"$/g, "")) || []
            : args;

        processedServers[server.name] = {
          command: server.command,
          args: processedArgs,
          env,
        };
      }

      // Create profile input
      const profileInput: CreateProfileInput = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        mcpServers: processedServers,
      };

      // Save profile
      const result = await saveProfile(profileInput);

      if (!result.success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create profile",
          message: result.error || "Unknown error occurred",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Profile created successfully",
        message: `"${values.name}" has been created`,
      });

      // Navigate back to profiles list
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addServer = () => {
    setServers([...servers, { name: "", command: "", args: [], envVars: "" }]);
  };

  const removeServer = (index: number) => {
    if (servers.length > 1) {
      setServers(servers.filter((_, i) => i !== index));
    }
  };

  const updateServer = (index: number, field: keyof MCPServerFormData, value: string | string[]) => {
    const updatedServers = [...servers];
    updatedServers[index] = { ...updatedServers[index], [field]: value };
    setServers(updatedServers);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Profile" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action title="Add Server" onAction={addServer} />
            {servers.length > 1 &&
              servers.map((_, index) => (
                <Action
                  key={`remove-${index}`}
                  title={`Remove Server ${index + 1}`}
                  onAction={() => removeServer(index)}
                  style={Action.Style.Destructive}
                />
              ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Enter profile name"
        info="A unique name for this MCP profile"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description of this profile"
        info="Brief description of what this profile is used for"
      />

      <Form.Separator />

      {servers
        .map((server, index) => [
          <Form.Description
            key={`desc-${index}`}
            title={`MCP Server ${index + 1}`}
            text={`Configure MCP server ${index + 1}`}
          />,
          <Form.TextField
            key={`name-${index}`}
            id={`server-${index}-name`}
            title="Server Name"
            placeholder="e.g., filesystem, git, database"
            value={server.name}
            onChange={(value) => updateServer(index, "name", value)}
            info="Unique identifier for this MCP server"
          />,
          <Form.TextField
            key={`command-${index}`}
            id={`server-${index}-command`}
            title="Command"
            placeholder="e.g., npx, python, node"
            value={server.command}
            onChange={(value) => updateServer(index, "command", value)}
            info="Executable command to run the MCP server"
          />,
          <Form.TextField
            key={`args-${index}`}
            id={`server-${index}-args`}
            title="Arguments"
            placeholder="e.g., @modelcontextprotocol/server-filesystem /path/to/allowed/files"
            value={Array.isArray(server.args) ? server.args.join(" ") : server.args}
            onChange={(value) => updateServer(index, "args", value)}
            info="Command line arguments (space-separated, use quotes for arguments with spaces)"
          />,
          <Form.TextArea
            key={`env-${index}`}
            id={`server-${index}-env`}
            title="Environment Variables"
            placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
            value={server.envVars}
            onChange={(value) => updateServer(index, "envVars", value)}
            info="JSON object of environment variables (optional)"
          />,
          ...(servers.length > 1
            ? [<Form.Description key={`remove-${index}`} title="" text={`Remove Server ${index + 1}`} />]
            : []),
        ])
        .flat()}

      <Form.Separator />

      <Form.Description title="Server Management" text="Use the actions above to add or remove MCP servers" />
    </Form>
  );
}
