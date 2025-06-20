import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  LaunchProps,
  Icon,
} from "@raycast/api";
import { RawConfigHelpScreen } from "./components/RawConfigEditor";
import { EditorManager } from "./services/EditorManager";
import {
  EditorType,
  MCPServerConfig,
  MCPServerWithMetadata,
  TransportType,
  StdioTransportConfig,
  SSETransportConfig,
  HTTPTransportConfig,
  BaseMCPServerConfig,
  VSCodeSpecificConfig,
  WindsurfSSETransportConfig,
  VSCodeInput,
} from "./types/mcpServer";
import { getEditorConfig, SUCCESS_MESSAGES } from "./utils/constants";
import { VSCodeEditorService } from "./services/VSCodeEditorService";
import { validateLockedServersPresent } from "./utils/protectedServers";
import { getTransportType } from "./utils/transportUtils";

interface EditServerArgs {
  editorType: EditorType;
  serverName: string;
  configType?: "global" | "workspace" | "user";
}

function VSCodeInputFormEdit({
  inputId,
  setInputId,
  inputDescription,
  setInputDescription,
  isPassword,
  setIsPassword,
  existingInputs,
}: {
  inputId: string;
  setInputId: (value: string) => void;
  inputDescription: string;
  setInputDescription: (value: string) => void;
  isPassword: boolean;
  setIsPassword: (value: boolean) => void;
  existingInputs: VSCodeInput[];
}) {
  const isDuplicate = existingInputs.some(
    (input) => input.id === inputId.trim(),
  );

  return (
    <>
      <Form.TextField
        id="newInputIdEdit"
        title="New Input ID"
        value={inputId}
        onChange={setInputId}
        placeholder="api-key"
        info="Unique identifier for this input (lowercase with hyphens)"
        error={
          isDuplicate
            ? `Input with ID "${inputId.trim()}" already exists`
            : undefined
        }
      />

      <Form.TextField
        id="newInputDescriptionEdit"
        title="Input Description"
        value={inputDescription}
        onChange={setInputDescription}
        placeholder="API Key for external service"
        info="User-friendly description shown when prompting"
      />

      <Form.Checkbox
        id="newInputPasswordEdit"
        title="Password Input"
        label="Treat as password (masked input)"
        value={isPassword}
        onChange={setIsPassword}
        info="Enable for sensitive values like API keys"
      />

      <Form.Description
        text={`Preview: ${inputId.trim() || "[id]"} - ${inputDescription.trim() || "[description]"}${isPassword ? " (password)" : ""}`}
      />

      {inputId.trim() && inputDescription.trim() && !isDuplicate && (
        <Form.Description text="Use Cmd+I to add this input" />
      )}
    </>
  );
}

export function EditServerForm({
  editorType,
  serverName,
  configType = "global",
  onComplete,
}: {
  editorType: EditorType;
  serverName: string;
  configType?: "global" | "workspace" | "user";
  onComplete?: () => void;
}) {
  const [editorManager] = useState(() => new EditorManager());
  const [serverConfig, setServerConfig] =
    useState<MCPServerWithMetadata | null>(null);
  const [formValues, setFormValues] = useState<
    Record<string, string | boolean | number | undefined>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConfigType, setSelectedConfigType] = useState<
    "workspace" | "user"
  >("user");
  const [workspaceInputs, setWorkspaceInputs] = useState<VSCodeInput[]>([]);
  const [userInputs, setUserInputs] = useState<VSCodeInput[]>([]);
  const [showInputManagement, setShowInputManagement] = useState(false);
  const [newInputId, setNewInputId] = useState("");
  const [newInputDescription, setNewInputDescription] = useState("");
  const [newInputIsPassword, setNewInputIsPassword] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<
    "stdio" | "sse" | "/sse" | "http"
  >("stdio");
  const { pop } = useNavigation();

  useEffect(() => {
    async function loadServerConfig() {
      try {
        setIsLoading(true);
        const servers = await editorManager.readServersFromEditor(
          editorType,
          configType,
        );
        const server = servers.find((s) => s.config.name === serverName);

        if (!server) {
          throw new Error(`Server "${serverName}" not found`);
        }

        setServerConfig(server);

        setSelectedTransport(
          getTransportType(server.config) as "stdio" | "sse" | "/sse" | "http",
        );

        const initialValues = convertServerConfigToFormValues(server.config);
        setFormValues(initialValues);
      } catch (error) {
        console.error("Failed to load server config:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load server",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        pop();
      } finally {
        setIsLoading(false);
      }
    }

    loadServerConfig();
  }, [editorType, serverName, configType]);

  useEffect(() => {
    if (editorType === "vscode") {
      loadVSCodeInputs();
    }
  }, [editorType]);

  async function loadVSCodeInputs() {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const [workspaceInputsData, userInputsData] = await Promise.all([
        vscodeService.readInputs("workspace"),
        vscodeService.readInputs("user"),
      ]);
      setWorkspaceInputs(workspaceInputsData);
      setUserInputs(userInputsData);
    } catch (error) {
      console.error("Failed to load VS Code inputs:", error);
    }
  }

  async function addVSCodeInput(
    input: VSCodeInput,
    configType: "workspace" | "user",
  ) {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const currentInputs =
        configType === "workspace" ? workspaceInputs : userInputs;

      if (currentInputs.some((existing) => existing.id === input.id)) {
        throw new Error(
          `Input with ID "${input.id}" already exists in ${configType} configuration`,
        );
      }

      const updatedInputs = [...currentInputs, input];
      await vscodeService.writeInputs(updatedInputs, configType);

      if (configType === "workspace") {
        setWorkspaceInputs(updatedInputs);
      } else {
        setUserInputs(updatedInputs);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Input added",
        message: `Added "${input.id}" to ${configType} inputs`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add input",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function removeVSCodeInput(
    inputId: string,
    configType: "workspace" | "user",
  ) {
    try {
      const vscodeService = editorManager.getService(
        "vscode",
      ) as VSCodeEditorService;
      const currentInputs =
        configType === "workspace" ? workspaceInputs : userInputs;
      const updatedInputs = currentInputs.filter(
        (input) => input.id !== inputId,
      );

      await vscodeService.writeInputs(updatedInputs, configType);

      if (configType === "workspace") {
        setWorkspaceInputs(updatedInputs);
      } else {
        setUserInputs(updatedInputs);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Input removed",
        message: `Removed "${inputId}" from ${configType} inputs`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove input",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function convertServerConfigToFormValues(
    config: MCPServerConfig,
  ): Record<string, string | boolean | number | undefined> {
    const values: Record<string, string | boolean | number | undefined> = {
      name: config.name || "",
      description: config.description || "",
      disabled: config.disabled ?? false,
      transport: getTransportType(config) || "stdio",
    };

    values.command = "";
    values.args = "";
    values.env = "";
    values.url = "";
    values.serverUrl = "";
    values.envFile = "";
    values.roots = "";

    if (getTransportType(config) === "stdio") {
      const stdioConfig = config as StdioTransportConfig & BaseMCPServerConfig;
      values.command = stdioConfig.command || "";
      values.args = stdioConfig.args ? stdioConfig.args.join("\n") : "";
      values.env = stdioConfig.env
        ? Object.entries(stdioConfig.env)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n")
        : "";
    } else if (
      getTransportType(config) === "sse" ||
      getTransportType(config) === "http"
    ) {
      const urlConfig = config as (SSETransportConfig | HTTPTransportConfig) &
        BaseMCPServerConfig;
      values.url = urlConfig.url || "";
    } else if (getTransportType(config) === "/sse") {
      const windsurfSSEConfig = config as WindsurfSSETransportConfig &
        BaseMCPServerConfig;
      values.serverUrl = windsurfSSEConfig.serverUrl || "";
    }

    if (editorType === "vscode") {
      const vsCodeConfig = config as VSCodeSpecificConfig;
      values.envFile = vsCodeConfig.envFile || "";
      values.roots = vsCodeConfig.roots ? vsCodeConfig.roots.join("\n") : "";
    }

    return values;
  }

  function convertFormValuesToServerConfig(
    values: Record<string, string | boolean | number | undefined>,
  ): MCPServerConfig {
    const baseConfig = {
      name: typeof values.name === "string" ? values.name.trim() : "",
      description:
        typeof values.description === "string"
          ? values.description.trim() || undefined
          : undefined,

      ...(editorType !== "cursor" && {
        disabled:
          typeof values.disabled === "boolean" ? values.disabled : false,
      }),
      transport: selectedTransport as TransportType,
    };

    if (editorType === "vscode") {
      if (selectedTransport === "stdio") {
        return {
          ...baseConfig,
          type: "stdio" as const,
          command:
            typeof values.command === "string" ? values.command.trim() : "",
          args:
            typeof values.args === "string" && values.args.trim()
              ? values.args
                  .split("\n")
                  .map((arg: string) => arg.trim())
                  .filter((arg: string) => arg.length > 0)
              : undefined,
          env:
            typeof values.env === "string"
              ? parseEnvironmentVariables(values.env)
              : undefined,
          envFile:
            "envFile" in values &&
            typeof values.envFile === "string" &&
            values.envFile.trim()
              ? values.envFile.trim()
              : undefined,
          roots:
            typeof values.roots === "string" && values.roots.trim()
              ? values.roots
                  .split("\n")
                  .map((root: string) => root.trim())
                  .filter((root: string) => root.length > 0)
              : undefined,
        };
      } else if (selectedTransport === "sse") {
        return {
          ...baseConfig,
          type: "sse" as const,
          url: typeof values.url === "string" ? values.url.trim() : "",
          envFile:
            "envFile" in values &&
            typeof values.envFile === "string" &&
            values.envFile.trim()
              ? values.envFile.trim()
              : undefined,
          roots:
            typeof values.roots === "string" && values.roots.trim()
              ? values.roots
                  .split("\n")
                  .map((root: string) => root.trim())
                  .filter((root: string) => root.length > 0)
              : undefined,
        };
      } else if (selectedTransport === "/sse") {
        return {
          ...baseConfig,
          transport: "/sse" as const,
          serverUrl:
            typeof values.serverUrl === "string" ? values.serverUrl.trim() : "",
        };
      } else {
        return {
          ...baseConfig,
          type: "http" as const,
          url: typeof values.url === "string" ? values.url.trim() : "",
          envFile:
            "envFile" in values &&
            typeof values.envFile === "string" &&
            values.envFile.trim()
              ? values.envFile.trim()
              : undefined,
          roots:
            typeof values.roots === "string" && values.roots.trim()
              ? values.roots
                  .split("\n")
                  .map((root: string) => root.trim())
                  .filter((root: string) => root.length > 0)
              : undefined,
          headers:
            typeof values.headers === "string" && values.headers.trim()
              ? parseHeaders(values.headers)
              : undefined,
        };
      }
    } else if (selectedTransport === "stdio") {
      return {
        ...baseConfig,
        transport: "stdio" as const,
        command:
          typeof values.command === "string" ? values.command.trim() : "",
        args:
          typeof values.args === "string" && values.args.trim()
            ? values.args
                .split("\n")
                .map((arg: string) => arg.trim())
                .filter((arg: string) => arg.length > 0)
            : undefined,
        env:
          typeof values.env === "string"
            ? parseEnvironmentVariables(values.env)
            : undefined,
      };
    } else if (selectedTransport === "sse") {
      return {
        ...baseConfig,
        transport: "sse" as const,
        url: typeof values.url === "string" ? values.url.trim() : "",
      };
    } else if (selectedTransport === "/sse") {
      return {
        ...baseConfig,
        transport: "/sse" as const,
        serverUrl:
          typeof values.serverUrl === "string" ? values.serverUrl.trim() : "",
      };
    } else {
      return {
        ...baseConfig,
        transport: "http" as const,
        url: typeof values.url === "string" ? values.url.trim() : "",
      };
    }
  }

  function parseEnvironmentVariables(
    envString: string,
  ): Record<string, string> | undefined {
    if (!envString.trim()) return undefined;

    const env: Record<string, string> = {};
    const lines = envString.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const equalIndex = trimmedLine.indexOf("=");
      if (equalIndex === -1) continue;

      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();

      if (key) {
        env[key] = value;
      }
    }

    return Object.keys(env).length > 0 ? env : undefined;
  }

  function parseHeaders(
    headersString: string,
  ): Record<string, string> | undefined {
    if (!headersString.trim()) return undefined;

    try {
      const headers = JSON.parse(headersString.trim());
      if (
        typeof headers === "object" &&
        headers !== null &&
        !Array.isArray(headers)
      ) {
        return headers;
      }
    } catch {
      // Note: Fall through to other parsing methods
    }

    return undefined;
  }

  function getAvailableTransports(): Array<{
    label: string;
    value: "stdio" | "sse" | "/sse" | "http";
  }> {
    const editorConfig = getEditorConfig(editorType);
    return editorConfig.supportedTransports.map((transport) => ({
      label:
        transport === "stdio"
          ? "Standard I/O (stdio) - [Local Server]"
          : transport === "sse"
            ? "Server-Sent Events (SSE) - [Remote Server]"
            : transport === "/sse"
              ? "Server-Sent Events (SSE) - [Remote Server]"
              : "HTTP - [Remote Server]",
      value: transport as "stdio" | "sse" | "/sse" | "http",
    }));
  }

  function renderVSCodeInputManagement() {
    if (editorType !== "vscode") return null;

    const currentInputs =
      selectedConfigType === "workspace" ? workspaceInputs : userInputs;

    return (
      <>
        <Form.Separator />
        <Form.Description text="VS Code Input Management" />

        <Form.Dropdown
          id="inputConfigType"
          title="Input Configuration Level"
          value={selectedConfigType}
          onChange={(newValue) =>
            setSelectedConfigType(newValue as "workspace" | "user")
          }
          info="Choose whether to manage inputs at workspace or user level"
        >
          <Form.Dropdown.Item
            value="workspace"
            title="Workspace (.vscode/mcp.json)"
          />
          <Form.Dropdown.Item
            value="user"
            title="User Settings (settings.json)"
          />
        </Form.Dropdown>

        {currentInputs.length > 0 && (
          <>
            <Form.Description
              text={`Current ${selectedConfigType} inputs (${currentInputs.length}):`}
            />
            {currentInputs.map((input) => (
              <Form.Description
                key={input.id}
                text={`• ${input.id} - ${input.description} ${input.password ? "(password)" : ""}`}
              />
            ))}
          </>
        )}

        <Form.Checkbox
          id="showInputManagement"
          title="Input Management"
          label="Show input management controls"
          value={showInputManagement}
          onChange={setShowInputManagement}
          info="Toggle to show controls for adding/removing inputs"
        />

        {showInputManagement && (
          <>
            <VSCodeInputFormEdit
              inputId={newInputId}
              setInputId={setNewInputId}
              inputDescription={newInputDescription}
              setInputDescription={setNewInputDescription}
              isPassword={newInputIsPassword}
              setIsPassword={setNewInputIsPassword}
              existingInputs={currentInputs}
            />
          </>
        )}

        <Form.Description text="Use \${input:input-id} syntax in environment variables, URLs, or command arguments to reference these inputs." />
      </>
    );
  }

  async function handleSubmit(
    values: Record<string, string | boolean | number | undefined>,
  ) {
    if (!serverConfig) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating server...",
      });
      const updatedConfig = convertFormValuesToServerConfig(values);

      const currentServers = await editorManager.readAllServers();
      const currentServerNames = currentServers
        .filter((s) => s.config.name !== serverName)
        .map((s) => s.config.name);
      const updatedServerNames = [...currentServerNames, updatedConfig.name];

      const validation = await validateLockedServersPresent(
        updatedServerNames,
        editorType,
        currentServerNames,
      );
      if (!validation.isValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot update server",
          message: validation.message,
        });
        return;
      }

      await editorManager.updateServer(
        editorType,
        serverName,
        updatedConfig,
        configType,
      );

      await showToast({
        style: Toast.Style.Success,
        title: SUCCESS_MESSAGES.SERVER_UPDATED,
        message: `${updatedConfig.name} updated in ${getEditorConfig(editorType).displayName}`,
      });

      if (onComplete) {
        onComplete();
      }
      pop();
    } catch (error) {
      console.error("Failed to update server:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update server",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (isLoading || !serverConfig || Object.keys(formValues).length === 0) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Loading…" />
          </ActionPanel>
        }
      >
        <Form.Description text="Loading server configuration..." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Update Server" />
          <Action.Push
            title="View Configuration Help"
            icon={Icon.QuestionMarkCircle}
            target={
              <RawConfigHelpScreen
                editorType={editorType}
                configType={selectedConfigType}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          <Action
            title="Cancel"
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />

          {editorType === "vscode" && showInputManagement && (
            <ActionPanel.Section title="Input Management">
              <Action
                title="Add Input"
                icon={Icon.Plus}
                onAction={() => {
                  if (newInputId.trim() && newInputDescription.trim()) {
                    const newInput: VSCodeInput = {
                      id: newInputId.trim(),
                      type: "promptString",
                      description: newInputDescription.trim(),
                      password: newInputIsPassword,
                    };
                    addVSCodeInput(newInput, selectedConfigType);
                    setNewInputId("");
                    setNewInputDescription("");
                    setNewInputIsPassword(false);
                  } else {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Invalid input",
                      message: "Both ID and description are required",
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />

              {(selectedConfigType === "workspace"
                ? workspaceInputs
                : userInputs
              ).length > 0 &&
                (selectedConfigType === "workspace"
                  ? workspaceInputs
                  : userInputs
                ).map((input) => (
                  <Action
                    key={`remove-${input.id}`}
                    title={`Remove "${input.id}"`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      removeVSCodeInput(input.id, selectedConfigType)
                    }
                  />
                ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Server Name"
        placeholder="context7"
        info="Unique identifier for this MCP server"
        value={formValues.name as string}
        onChange={(value) =>
          setFormValues((prev) => ({ ...prev, name: value }))
        }
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Up-to-date code docs for any prompt."
        info="Optional description of what this server does"
        value={formValues.description as string}
        onChange={(value) =>
          setFormValues((prev) => ({ ...prev, description: value }))
        }
      />

      {editorType !== "cursor" && (
        <Form.Checkbox
          id="disabled"
          title="Disabled"
          label="Temporarily disable this server"
          info="The server will be configured but not active"
          value={formValues.disabled as boolean}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, disabled: value }))
          }
        />
      )}

      {editorType === "cursor" && (
        <Form.Checkbox
          id="cursorDisabled"
          title="Disabled"
          label="Not Available"
          value={false}
          onChange={() => {}}
          info="Enable/disable is controlled through Cursor's MCP settings UI"
        />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="transport"
        title="Transport Type"
        info="Method used to communicate with the server"
        value={selectedTransport || "stdio"}
        onChange={(newValue) =>
          setSelectedTransport(newValue as "stdio" | "sse" | "/sse" | "http")
        }
      >
        {getAvailableTransports().map((transport) => (
          <Form.Dropdown.Item
            key={transport.value}
            value={transport.value}
            title={transport.label}
          />
        ))}
      </Form.Dropdown>

      {selectedTransport === "stdio" && (
        <>
          <Form.TextField
            id="command"
            title="Command"
            placeholder="python -m my_mcp_server"
            info="The command to execute to start the server"
            value={formValues.command as string}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, command: value }))
            }
          />

          <Form.TextArea
            id="args"
            title="Arguments"
            placeholder="--port&#10;8000&#10;--verbose"
            info="Command line arguments (one per line)"
            value={formValues.args as string}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, args: value }))
            }
          />

          <Form.TextArea
            id="env"
            title="Environment Variables"
            placeholder="API_KEY=your_key&#10;DEBUG=true"
            info="Environment variables in KEY=VALUE format (one per line)"
            value={formValues.env as string}
            onChange={(value) =>
              setFormValues((prev) => ({ ...prev, env: value }))
            }
          />
        </>
      )}

      {selectedTransport === "sse" && (
        <Form.TextField
          id="url"
          title="Server URL"
          placeholder="https://mcp.context7.com/mcp"
          info="The remote endpoint URL for the server"
          value={formValues.url as string}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, url: value }))
          }
        />
      )}

      {selectedTransport === "/sse" && (
        <Form.TextField
          id="serverUrl"
          title="Server URL"
          placeholder="https://mcp.context7.com/sse"
          info="The SSE endpoint URL for the server (Windsurf format)"
          value={formValues.serverUrl as string}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, serverUrl: value }))
          }
        />
      )}

      {selectedTransport === "http" && (
        <Form.TextField
          id="url"
          title="Server URL"
          placeholder="http://localhost:8000"
          info="The HTTP endpoint URL for the server"
          value={formValues.url as string}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, url: value }))
          }
        />
      )}

      <Form.Separator />

      {editorType === "vscode" && (
        <>
          <Form.Description text="VS Code-Specific Settings" />

          {selectedTransport === "stdio" && (
            <Form.TextField
              id="envFile"
              title="Environment File"
              placeholder=".env"
              info="Path to environment file for loading variables"
              value={formValues.envFile as string}
              onChange={(value) =>
                setFormValues((prev) => ({ ...prev, envFile: value }))
              }
            />
          )}

          {(selectedTransport === "stdio" || selectedTransport === "http") && (
            <Form.TextArea
              id="roots"
              title="Root Paths"
              placeholder="/path/to/project&#10;/another/path"
              info="Root paths for the server (one per line)"
              value={formValues.roots as string}
              onChange={(value) =>
                setFormValues((prev) => ({ ...prev, roots: value }))
              }
            />
          )}
        </>
      )}

      {renderVSCodeInputManagement()}
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: EditServerArgs }>,
) {
  const { editorType, serverName, configType = "global" } = props.arguments;

  return (
    <EditServerForm
      editorType={editorType}
      serverName={serverName}
      configType={configType}
    />
  );
}
