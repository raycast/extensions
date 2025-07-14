import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { getProfile, updateProfile } from "../utils/storage";
import { UpdateProfileInput, MCPServerConfig, MCPProfile } from "../types";

interface MCPServerFormData extends MCPServerConfig {
  name: string;
  envVars: string; // JSON string representation of env vars
}

interface EditProfileFormProps {
  profileId: string;
  onRefresh?: () => void;
}

export default function EditProfileForm({ profileId, onRefresh }: EditProfileFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<MCPProfile | null>(null);
  const [servers, setServers] = useState<MCPServerFormData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getProfile(profileId);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Profile not found");
      }

      const profileData = result.data;
      setProfile(profileData);

      // Convert MCP servers to form data
      const serverFormData = Object.entries(profileData.mcpServers).map(([name, config]) => ({
        name,
        command: config.command,
        args: config.args,
        envVars: config.env ? JSON.stringify(config.env, null, 2) : "",
      }));

      setServers(serverFormData.length > 0 ? serverFormData : [{ name: "", command: "", args: [], envVars: "" }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load profile";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading profile",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: { name: string; description: string }) => {
    if (isSubmitting || !profile) return;

    try {
      setIsSubmitting(true);

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
            ? args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) => arg.replace(/^"|"$/g, "")) || []
            : args;

        processedServers[server.name] = {
          command: server.command,
          args: processedArgs,
          env,
        };
      }

      // Create update input
      const updateInput: UpdateProfileInput = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        mcpServers: processedServers,
      };

      // Update profile
      const result = await updateProfile(profileId, updateInput);

      if (!result.success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update profile",
          message: result.error || "Unknown error occurred",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Profile updated successfully",
        message: `"${values.name}" has been updated`,
      });

      // Refresh parent list before navigating back
      onRefresh?.();

      // Navigate back to profiles list
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unexpected error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
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

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={loadProfile} />
            <Action title="Go Back" onAction={pop} />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={error} />
      </Form>
    );
  }

  // Don't render form until profile is loaded
  if (!profile) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action title="Cancel" onAction={pop} />
          </ActionPanel>
        }
      >
        <Form.Description title="Loading" text="Loading profile data..." />
      </Form>
    );
  }

  return (
    <Form
      key={profile.id}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Profile" onSubmit={handleSubmit} />
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
          <ActionPanel.Section>
            <Action title="Cancel" onAction={pop} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      navigationTitle={`Edit Profile: ${profile.name}`}
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Enter profile name"
        defaultValue={profile.name}
        info="A unique name for this MCP profile"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description of this profile"
        defaultValue={profile.description || ""}
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
