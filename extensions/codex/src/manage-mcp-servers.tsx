import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  showFailureToast,
  useCachedPromise,
  useCachedState,
  useForm,
  usePromise,
} from "@raycast/utils";
import { isDeepStrictEqual } from "node:util";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type McpServerRuntimeStatus,
  getCodexHome,
  listMcpServerStatuses,
  readMcpConfiguration,
  reloadMcpServers,
  startMcpOauthLogin,
  writeMcpServerMap,
} from "./utils/app-server";
import {
  type CodexDesktopProject,
  loadCodexDesktopProjects,
} from "./utils/desktop-projects";
import { tildeifyPath } from "./utils/format";
import {
  type McpConfigLayer,
  type McpServerFormValues,
  type McpServerMutation,
  type McpServerRecord,
  buildMcpServerConfig,
  buildUpdatedMcpServerMap,
  formatKeyValueMap,
  formatMcpHeaders,
  getEffectiveMcpServerMap,
  joinMcpServers,
  normalizeMcpConfigLayers,
  partitionMcpServers,
  redactMcpServerConfig,
  validateMcpHttpUrl,
  validateMcpKeyValueLines,
  validateMcpServerName,
} from "./utils/mcp-servers";
import { revalidateWithToast, validateOnSubmitOnly } from "./utils/raycast";

const maximumVisibleTools = 20;
const mcpServerIcon = {
  source: { light: "mcp-light.svg", dark: "mcp-dark.svg" },
};
type RuntimeDetailsState = "loading" | "loaded" | "unavailable";

export default function ManageMcpServersCommand() {
  const [folderContext, setFolderContext] = useCachedState<string | null>(
    "mcp-folder-context",
    null,
  );
  const statusRequestAbort = useRef<AbortController | null>(null);
  const configState = usePromise(readMcpConfiguration, [folderContext], {
    failureToastOptions: { title: "Couldn't load Codex MCP configuration" },
  });
  const projectsState = useCachedPromise(loadProjects, [], {
    initialData: [] as CodexDesktopProject[],
  });
  const statusState = useCachedPromise(
    () => listMcpServerStatuses(statusRequestAbort.current?.signal),
    [],
    {
      abortable: statusRequestAbort,
      failureToastOptions: {
        title: "Couldn't load Codex MCP runtime details",
      },
    },
  );
  const layers = useMemo(
    () => (configState.data ? normalizeMcpConfigLayers(configState.data) : []),
    [configState.data],
  );
  const records = useMemo(
    () =>
      joinMcpServers(
        layers,
        statusState.data ?? [],
        configState.data ? getEffectiveMcpServerMap(configState.data) : {},
      ),
    [configState.data, layers, statusState.data],
  );
  const allServerNames = useMemo(
    () => records.map((server) => server.name),
    [records],
  );
  const sections = partitionMcpServers(records);
  const editableLayer = layers.find((layer) => layer.editable) ?? null;
  const runtimeDetailsState: RuntimeDetailsState = statusState.data
    ? "loaded"
    : statusState.isLoading
      ? "loading"
      : "unavailable";
  const refresh = async () => {
    if (!statusState.isLoading) {
      statusState.revalidate();
    }
    await revalidateWithToast(() => configState.revalidate(), {
      successTitle: "MCP Servers Refreshed",
      failureTitle: "Couldn't refresh MCP servers",
    });
  };
  const refreshAfterChange = async () => {
    const configRefresh = configState.revalidate();
    statusState.revalidate();
    await configRefresh.catch(() => undefined);
  };

  if (
    !configState.data &&
    !statusState.data &&
    configState.error &&
    statusState.error
  ) {
    return (
      <Detail
        markdown={`# Couldn't Load MCP Servers\n\nCodex configuration: ${configState.error.message}\n\nRuntime details: ${statusState.error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={configState.isLoading}
      isShowingDetail
      navigationTitle={
        folderContext
          ? `Manage MCP Servers (${tildeifyPath(folderContext)})`
          : undefined
      }
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search Codex MCP servers"
    >
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={String(section.records.length)}
        >
          {section.records.map((record) => (
            <McpServerListItem
              key={record.name}
              record={record}
              runtimeDetailsState={runtimeDetailsState}
              editableLayer={editableLayer}
              allServerNames={allServerNames}
              projects={projectsState.data}
              folderContext={folderContext}
              onChooseFolderContext={setFolderContext}
              onRefresh={refresh}
              onChanged={refreshAfterChange}
            />
          ))}
        </List.Section>
      ))}

      {configState.error && !configState.data ? (
        <UnavailableSectionItem
          title="Configuration Unavailable"
          message={configState.error.message}
          onRefresh={refresh}
        />
      ) : null}
      {statusState.error && !statusState.data ? (
        <UnavailableSectionItem
          title="Runtime Details Unavailable"
          message={statusState.error.message}
          onRefresh={refresh}
        />
      ) : null}

      {!configState.isLoading &&
      !statusState.isLoading &&
      records.length === 0 ? (
        <List.EmptyView
          title="No MCP Servers Yet"
          description="Press ⌘N to install one."
          icon={mcpServerIcon}
          actions={
            <ActionPanel>
              <InstallServerSection
                editableLayer={editableLayer}
                allServerNames={[]}
                folderContext={folderContext}
                onChanged={refreshAfterChange}
              />
              <CommonActions
                projects={projectsState.data}
                folderContext={folderContext}
                onChooseFolderContext={setFolderContext}
                onRefresh={refresh}
                onChanged={refreshAfterChange}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function UnavailableSectionItem({
  title,
  message,
  onRefresh,
}: {
  title: string;
  message: string;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Section title="Unavailable">
      <List.Item
        title={title}
        subtitle={message}
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        detail={<List.Item.Detail markdown={`# ${title}\n\n${message}`} />}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function McpServerListItem({
  record,
  runtimeDetailsState,
  editableLayer,
  allServerNames,
  projects,
  folderContext,
  onChooseFolderContext,
  onRefresh,
  onChanged,
}: {
  record: McpServerRecord;
  runtimeDetailsState: RuntimeDetailsState;
  editableLayer: McpConfigLayer | null;
  allServerNames: string[];
  projects: CodexDesktopProject[];
  folderContext: string | null;
  onChooseFolderContext: (folder: string | null) => void;
  onRefresh: () => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  return (
    <List.Item
      title={record.name}
      subtitle={
        record.transport === "stdio"
          ? "Local"
          : record.transport === "http"
            ? "Remote"
            : undefined
      }
      icon={getServerIcon(record)}
      keywords={[
        record.name,
        record.transport,
        record.layer?.label ?? "",
        record.layer?.sourcePath ?? "",
        ...record.tools,
      ]}
      detail={
        <McpServerDetail
          record={record}
          runtimeDetailsState={runtimeDetailsState}
        />
      }
      actions={
        <McpServerActions
          record={record}
          editableLayer={editableLayer}
          allServerNames={allServerNames}
          projects={projects}
          folderContext={folderContext}
          onChooseFolderContext={onChooseFolderContext}
          onRefresh={onRefresh}
          onChanged={onChanged}
        />
      }
    />
  );
}

function McpServerDetail({
  record,
  runtimeDetailsState,
}: {
  record: McpServerRecord;
  runtimeDetailsState: RuntimeDetailsState;
}) {
  const displayedTools = record.tools.slice(0, maximumVisibleTools);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={getStatusLabel(record)}
          />
          <List.Item.Detail.Metadata.Label
            title="Authentication"
            text={formatAuthStatus(record.authStatus, runtimeDetailsState)}
          />
          {record.runtimeStatus ? (
            <List.Item.Detail.Metadata.Label
              title="Connection"
              text={formatRuntimeStatus(record.runtimeStatus)}
            />
          ) : null}
          {record.pluginId ? (
            <List.Item.Detail.Metadata.Label
              title="Plugin"
              text={record.pluginId}
            />
          ) : null}
          {record.contributingLayers.length > 1 ? (
            <List.Item.Detail.Metadata.Label
              title="Precedence"
              text={`${record.contributingLayers.map((layer) => layer.label).join(" → ")} (later wins)`}
            />
          ) : null}
          {record.layer?.disabledReason ? (
            <List.Item.Detail.Metadata.Label
              title="Locked Reason"
              text={record.layer.disabledReason}
            />
          ) : null}
          {displayedTools.length > 0 ? (
            <List.Item.Detail.Metadata.TagList
              title={
                record.tools.length > displayedTools.length
                  ? `Tools (first ${displayedTools.length} of ${record.tools.length})`
                  : "Tools"
              }
            >
              {displayedTools.map((tool) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={tool}
                  text={tool}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Tools"
              text={
                runtimeDetailsState === "loading"
                  ? "Loading from Codex"
                  : record.runtimeAvailable
                    ? "None reported"
                    : "Unavailable"
              }
            />
          )}
          {record.resourceCount > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Resources"
              text={String(record.resourceCount)}
            />
          ) : null}
          {record.resourceTemplateCount > 0 ? (
            <List.Item.Detail.Metadata.Label
              title="Resource Templates"
              text={String(record.resourceTemplateCount)}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function McpServerActions({
  record,
  editableLayer,
  allServerNames,
  projects,
  folderContext,
  onChooseFolderContext,
  onRefresh,
  onChanged,
}: {
  record: McpServerRecord;
  editableLayer: McpConfigLayer | null;
  allServerNames: string[];
  projects: CodexDesktopProject[];
  folderContext: string | null;
  onChooseFolderContext: (folder: string | null) => void;
  onRefresh: () => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const serverLayer = record.editable ? record.layer : null;
  const oauthAbort = useRef<AbortController | null>(null);
  useEffect(() => () => oauthAbort.current?.abort(), []);
  const signIn = async () => {
    if (oauthAbort.current) return;
    const controller = new AbortController();
    oauthAbort.current = controller;
    try {
      await beginOauth(record, onChanged, controller);
    } finally {
      oauthAbort.current = null;
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {serverLayer && record.config ? (
          <Action.Push
            title="Edit Server"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <McpServerForm
                mode="edit"
                record={record}
                layer={serverLayer}
                allServerNames={allServerNames}
                folderContext={folderContext}
                onChanged={onChanged}
              />
            }
          />
        ) : null}
        {record.authStatus === "notLoggedIn" ? (
          <Action
            title="Sign in or Reconnect"
            icon={Icon.Key}
            onAction={signIn}
          />
        ) : null}
        {record.config ? (
          <Action.Push
            title="Show Configuration"
            icon={Icon.Code}
            shortcut={Keyboard.Shortcut.Common.Open}
            target={<SafeConfigurationDetail record={record} />}
          />
        ) : null}
      </ActionPanel.Section>

      <InstallServerSection
        editableLayer={editableLayer}
        allServerNames={allServerNames}
        folderContext={folderContext}
        onChanged={onChanged}
      />

      <CommonActions
        projects={projects}
        folderContext={folderContext}
        onChooseFolderContext={onChooseFolderContext}
        onRefresh={onRefresh}
        onChanged={onChanged}
      >
        <Action.CopyToClipboard
          title="Copy Server Name"
          content={record.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {record.layer?.sourcePath ? (
          <Action.CopyToClipboard
            title="Copy Source Path"
            content={record.layer.sourcePath}
            shortcut={Keyboard.Shortcut.Common.CopyPath}
          />
        ) : null}
      </CommonActions>

      {serverLayer && record.config ? (
        <ActionPanel.Section>
          <Action
            title={
              record.enabled === false ? "Enable Server" : "Disable Server"
            }
            icon={
              record.enabled === false ? Icon.CheckCircle : Icon.XMarkCircle
            }
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() =>
              confirmEnabledChange({
                record,
                layer: serverLayer,
                enabled: record.enabled === false,
                folderContext,
                onChanged,
              })
            }
          />
          <Action
            title="Uninstall Server"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() =>
              confirmRemoval({
                record,
                layer: serverLayer,
                folderContext,
                onChanged,
              })
            }
          />
        </ActionPanel.Section>
      ) : null}
    </ActionPanel>
  );
}

function InstallServerSection({
  editableLayer,
  allServerNames,
  folderContext,
  onChanged,
}: {
  editableLayer: McpConfigLayer | null;
  allServerNames: string[];
  folderContext: string | null;
  onChanged: () => Promise<void>;
}) {
  if (!editableLayer) {
    return null;
  }
  return (
    <ActionPanel.Section>
      <Action.Push
        title="Install New Server"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={
          <McpServerForm
            mode="add"
            layer={editableLayer}
            allServerNames={allServerNames}
            folderContext={folderContext}
            onChanged={onChanged}
          />
        }
      />
    </ActionPanel.Section>
  );
}

function CommonActions({
  projects,
  folderContext,
  onChooseFolderContext,
  onRefresh,
  onChanged,
  children,
}: {
  projects: CodexDesktopProject[];
  folderContext: string | null;
  onChooseFolderContext: (folder: string | null) => void;
  onRefresh: () => Promise<void>;
  onChanged: () => Promise<void>;
  children?: ComponentProps<typeof ActionPanel.Section>["children"];
}) {
  return (
    <ActionPanel.Section>
      {children}
      <Action
        title="Refresh List"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action
        title="Reload Configuration in Codex"
        icon={Icon.Repeat}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={() => reloadAndRefresh(onChanged)}
      />
      <ActionPanel.Submenu title="Show Project Servers" icon={Icon.Folder}>
        <Action.Push
          title="Choose Folder…"
          icon={Icon.Finder}
          target={
            <FolderContextForm
              currentFolder={folderContext}
              onChoose={onChooseFolderContext}
            />
          }
        />
        {projects.flatMap((project) =>
          project.roots
            .filter((root) => root.isAvailable)
            .map((root, index) => (
              <Action
                key={root.path}
                title={getProjectRootTitle(project, root.path, index)}
                icon={
                  root.path === folderContext ? Icon.CheckCircle : Icon.Folder
                }
                onAction={() => onChooseFolderContext(root.path)}
              />
            )),
        )}
      </ActionPanel.Submenu>
      {folderContext ? (
        <Action
          title="Show Personal Servers Only"
          icon={Icon.Person}
          onAction={() => onChooseFolderContext(null)}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

function getProjectRootTitle(
  project: CodexDesktopProject,
  path: string,
  index: number,
): string {
  return index === 0 ? project.name : `${project.name} (${tildeifyPath(path)})`;
}

async function loadProjects(): Promise<CodexDesktopProject[]> {
  return loadCodexDesktopProjects(await getCodexHome());
}

function SafeConfigurationDetail({ record }: { record: McpServerRecord }) {
  const safeConfiguration = JSON.stringify(
    redactMcpServerConfig(record.config ?? {}),
    null,
    2,
  );
  return (
    <Detail
      markdown={`# ${record.name}\n\nSecret values are redacted.\n\n~~~json\n${safeConfiguration}\n~~~`}
    />
  );
}

type McpServerFormProps = {
  layer: McpConfigLayer;
  allServerNames: string[];
  folderContext: string | null;
  onChanged: () => Promise<void>;
} & (
  | { mode: "add"; record?: never }
  | { mode: "edit"; record: McpServerRecord }
);

function McpServerForm(props: McpServerFormProps) {
  const { mode, layer, allServerNames, folderContext, onChanged } = props;
  const record = props.mode === "edit" ? props.record : undefined;
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    transport: initialTransport,
    authentication: initialAuthentication,
    ...initialFields
  } = getInitialFormValues(record);
  const [transport, setTransport] = useState(initialTransport);
  const [authentication, setAuthentication] = useState(initialAuthentication);
  const form = useForm<
    Omit<McpServerFormValues, "transport" | "authentication">
  >({
    initialValues: initialFields,
    validation: {
      name: (value) =>
        validateMcpServerName(value, allServerNames, record?.name),
      command: (value) =>
        transport === "stdio" && !value?.trim()
          ? "Command is required for a local server"
          : undefined,
      url: (value) =>
        transport === "http" ? validateMcpHttpUrl(value) : undefined,
      bearerTokenEnvironmentName: (value) =>
        transport === "http" &&
        authentication === "bearerEnvironment" &&
        !value?.trim()
          ? "Bearer token environment name is required"
          : undefined,
      environmentVariables: validateMcpKeyValueLines,
      httpHeaders: validateMcpKeyValueLines,
    },
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const config = buildMcpServerConfig(
          { ...values, transport, authentication },
          record?.config ?? undefined,
        );
        await applyMcpMutation({
          folderContext,
          layerId: layer.id,
          mutation:
            props.mode === "add"
              ? { type: "add", name: values.name.trim(), config }
              : {
                  type: "replace",
                  name: props.record.name,
                  config,
                  expectedConfig: layer.servers[props.record.name],
                },
          successTitle:
            mode === "add" ? "MCP Server Installed" : "MCP Server Saved",
          onChanged,
        });
        pop();
      } catch (error) {
        await showFailureToast(error, {
          title:
            mode === "add"
              ? "Couldn't add MCP server"
              : "Couldn't save MCP server",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });
  const isStdio = transport === "stdio";
  const toolOptions = Array.from(
    new Set([
      ...(record?.tools ?? []),
      ...(initialFields.allowedTools ?? []),
      ...(initialFields.deniedTools ?? []),
    ]),
  ).sort();

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={
        mode === "add" ? "Install MCP Server" : `Edit ${record?.name}`
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "add" ? "Install Server" : "Save Server"}
            icon={mode === "add" ? Icon.Plus : Icon.Check}
            onSubmit={form.handleSubmit}
          />
        </ActionPanel>
      }
    >
      {mode === "add" ? (
        <Form.TextField
          title="Name"
          placeholder="context7"
          autoFocus
          {...form.itemProps.name}
        />
      ) : null}
      <Form.Dropdown
        id="transport"
        title="Transport"
        value={transport}
        onChange={(value) => {
          setTransport(value === "http" ? "http" : "stdio");
        }}
      >
        <Form.Dropdown.Item
          value="stdio"
          title="Local Command (STDIO)"
          icon={Icon.Terminal}
        />
        <Form.Dropdown.Item
          value="http"
          title="Remote URL (HTTP)"
          icon={Icon.Globe}
        />
      </Form.Dropdown>

      {isStdio ? (
        <>
          <Form.TextField
            title="Command"
            placeholder="npx"
            {...form.itemProps.command}
          />
          <Form.TextArea
            title="Arguments"
            placeholder={"-y\n@modelcontextprotocol/server"}
            {...form.itemProps.arguments}
          />
          <Form.TextArea
            title="Environment Variables"
            placeholder={"API_KEY=value\nDEBUG=true"}
            {...form.itemProps.environmentVariables}
          />
        </>
      ) : (
        <>
          <Form.TextField
            title="URL"
            placeholder="https://example.com/mcp"
            {...form.itemProps.url}
          />
          <Form.Dropdown
            id="authentication"
            title="Authentication"
            value={authentication ?? "oauth"}
            onChange={(value) => {
              setAuthentication(isAuthentication(value) ? value : "oauth");
            }}
          >
            <Form.Dropdown.Item value="oauth" title="OAuth (Default)" />
            {initialAuthentication === "chatgpt" ? (
              <Form.Dropdown.Item value="chatgpt" title="ChatGPT Session" />
            ) : null}
            <Form.Dropdown.Item
              value="bearerEnvironment"
              title="Bearer Token from Environment Variable"
            />
          </Form.Dropdown>
          {authentication === "bearerEnvironment" ? (
            <Form.TextField
              title="Environment Variable"
              placeholder="Variable name, e.g. MCP_TOKEN"
              {...form.itemProps.bearerTokenEnvironmentName}
            />
          ) : null}
          <Form.TextArea
            title="Headers"
            placeholder={
              "Authorization=Bearer abc123\nx-api-key=$MY_KEY (reads MY_KEY from your environment)"
            }
            {...form.itemProps.httpHeaders}
          />
        </>
      )}

      <Form.Separator />
      <Form.Dropdown
        id="defaultToolApprovalMode"
        title="Tool Approval"
        value={form.values.defaultToolApprovalMode ?? ""}
        onChange={(value) => {
          if (value === "" || isApprovalMode(value)) {
            form.setValue("defaultToolApprovalMode", value);
          }
        }}
      >
        <Form.Dropdown.Item value="" title="Codex Decides (Default)" />
        <Form.Dropdown.Item value="prompt" title="Always Ask" />
        <Form.Dropdown.Item value="writes" title="Ask Unless Read-Only" />
        <Form.Dropdown.Item value="approve" title="Never Ask" />
      </Form.Dropdown>
      {mode === "edit" && toolOptions.length > 0 ? (
        <>
          <Form.TagPicker
            id="allowedTools"
            title="Allowed Tools"
            placeholder="Select tools"
            value={form.values.allowedTools ?? []}
            onChange={(tools) => {
              const selectedTools = new Set(tools);
              form.setValue("allowedTools", tools);
              form.setValue(
                "deniedTools",
                (form.values.deniedTools ?? []).filter(
                  (tool) => !selectedTools.has(tool),
                ),
              );
            }}
          >
            {toolOptions.map((tool) => (
              <Form.TagPicker.Item key={tool} value={tool} title={tool} />
            ))}
          </Form.TagPicker>
          <Form.TagPicker
            id="deniedTools"
            title="Denied Tools"
            placeholder="Select tools"
            value={form.values.deniedTools ?? []}
            onChange={(tools) => {
              const selectedTools = new Set(tools);
              form.setValue("deniedTools", tools);
              form.setValue(
                "allowedTools",
                (form.values.allowedTools ?? []).filter(
                  (tool) => !selectedTools.has(tool),
                ),
              );
            }}
          >
            {toolOptions.map((tool) => (
              <Form.TagPicker.Item key={tool} value={tool} title={tool} />
            ))}
          </Form.TagPicker>
        </>
      ) : null}
    </Form>
  );
}

function FolderContextForm({
  currentFolder,
  onChoose,
}: {
  currentFolder: string | null;
  onChoose: (folder: string | null) => void;
}) {
  const { pop } = useNavigation();
  const form = useForm<{ folder: string[] }>({
    initialValues: { folder: currentFolder ? [currentFolder] : [] },
    validation: {
      folder: (value) => (value?.length ? undefined : "Choose a folder"),
    },
    onSubmit: ({ folder }) => {
      onChoose(folder[0]);
      pop();
    },
  });
  return (
    <Form
      navigationTitle="Project Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Show Servers"
            onSubmit={form.handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        {...validateOnSubmitOnly(form.itemProps.folder)}
      />
      <Form.Description text="Shows the MCP servers this project's own .codex/config.toml adds. They are read-only here." />
    </Form>
  );
}

async function applyMcpMutation({
  folderContext,
  layerId,
  mutation,
  successTitle,
  onChanged,
}: {
  folderContext: string | null;
  layerId: string;
  mutation: McpServerMutation;
  successTitle: string;
  onChanged: () => Promise<void>;
}) {
  const latest = await readMcpConfiguration(folderContext);
  const layer = normalizeMcpConfigLayers(latest).find(
    (item) => item.id === layerId,
  );
  if (!layer?.editable || !layer.sourcePath) {
    throw new Error(
      "This configuration layer is no longer editable. Refresh and try again.",
    );
  }
  const updatedMap = buildUpdatedMcpServerMap(layer.servers, mutation);
  await writeMcpServerMap({
    filePath: layer.sourcePath,
    expectedVersion: layer.version,
    mcpServers: updatedMap,
  });

  let reloadError: unknown;
  try {
    await reloadMcpServers();
  } catch (error) {
    reloadError = error;
  }

  const confirmed = await readMcpConfiguration(folderContext);
  const confirmedLayer = normalizeMcpConfigLayers(confirmed).find(
    (item) => item.id === layerId,
  );
  if (
    !confirmedLayer ||
    !isDeepStrictEqual(confirmedLayer.servers, updatedMap)
  ) {
    throw new Error("Codex did not confirm the expected configuration change");
  }

  await onChanged();
  if (reloadError) {
    await showFailureToast(reloadError, {
      title: "Configuration changed, but reload wasn't confirmed",
    });
    return;
  }
  await showToast({ style: Toast.Style.Success, title: successTitle });
}

async function confirmEnabledChange({
  record,
  layer,
  enabled,
  folderContext,
  onChanged,
}: {
  record: McpServerRecord;
  layer: McpConfigLayer;
  enabled: boolean;
  folderContext: string | null;
  onChanged: () => Promise<void>;
}) {
  const action = enabled ? "Enable" : "Disable";
  if (
    !(await confirmAlert({
      title: `${action} ${record.name}?`,
      message: `${action} this server in ${layer.label.toLowerCase()} and ask Codex to reload MCP servers.`,
      primaryAction: { title: action },
    }))
  ) {
    return;
  }
  try {
    await applyMcpMutation({
      folderContext,
      layerId: layer.id,
      mutation: { type: "setEnabled", name: record.name, enabled },
      successTitle: `MCP Server ${enabled ? "Enabled" : "Disabled"}`,
      onChanged,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: `Couldn't ${action.toLowerCase()} MCP server`,
    });
  }
}

async function confirmRemoval({
  record,
  layer,
  folderContext,
  onChanged,
}: {
  record: McpServerRecord;
  layer: McpConfigLayer;
  folderContext: string | null;
  onChanged: () => Promise<void>;
}) {
  if (
    !(await confirmAlert({
      title: `Uninstall ${record.name} from Codex?`,
      message: `This removes the server from ${layer.sourcePath} and asks Codex to reload MCP servers. The server's software and any OAuth access stay in place.`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    }))
  ) {
    return;
  }
  try {
    await applyMcpMutation({
      folderContext,
      layerId: layer.id,
      mutation: { type: "remove", name: record.name },
      successTitle: "MCP Server Uninstalled",
      onChanged,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: "Couldn't uninstall MCP server",
    });
  }
}

async function beginOauth(
  record: McpServerRecord,
  onChanged: () => Promise<void>,
  controller: AbortController,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting MCP Sign-In",
    primaryAction: { title: "Cancel", onAction: () => controller.abort() },
  });
  try {
    const configuredScopes = Array.isArray(record.config?.scopes)
      ? record.config.scopes.filter(
          (scope): scope is string => typeof scope === "string",
        )
      : undefined;
    await startMcpOauthLogin(
      record.name,
      async (url) => {
        await open(url);
        toast.title = "Continue Sign-In in Your Browser";
      },
      configuredScopes,
      controller.signal,
    );
    toast.style = Toast.Style.Success;
    toast.title = "MCP Sign-In Complete";
    toast.primaryAction = undefined;
  } catch (error) {
    if (controller.signal.aborted) {
      await toast.hide();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't Complete MCP Sign-In";
      toast.message = error instanceof Error ? error.message : String(error);
      toast.primaryAction = undefined;
    }
    return;
  }
  // Refresh errors must not relabel a successful sign-in as an auth failure.
  try {
    await onChanged();
  } catch (error) {
    await showFailureToast(error, {
      title: "Signed In; Couldn't Refresh MCP Servers",
    });
  }
}

async function reloadAndRefresh(onRefresh: () => Promise<void>) {
  try {
    await reloadMcpServers();
    await onRefresh();
    await showToast({
      style: Toast.Style.Success,
      title: "MCP Servers Reloaded",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't reload MCP servers" });
  }
}

function getInitialFormValues(record?: McpServerRecord): McpServerFormValues {
  const config = record?.config ?? {};
  const transport = record?.transport === "http" ? "http" : "stdio";
  return {
    name: record?.name ?? "",
    transport,
    enabled: config.enabled !== false,
    command: typeof config.command === "string" ? config.command : "",
    arguments: stringArray(config.args).join("\n"),
    environmentVariables: formatKeyValueMap(config.env),
    url: typeof config.url === "string" ? config.url : "",
    authentication: getInitialAuthentication(config),
    bearerTokenEnvironmentName:
      typeof config.bearer_token_env_var === "string"
        ? config.bearer_token_env_var
        : "",
    httpHeaders: formatMcpHeaders(config),
    defaultToolApprovalMode: isApprovalMode(config.default_tools_approval_mode)
      ? config.default_tools_approval_mode
      : "",
    allowedTools: stringArray(config.enabled_tools),
    deniedTools: stringArray(config.disabled_tools),
  };
}

function getInitialAuthentication(
  config: Record<string, unknown>,
): McpServerFormValues["authentication"] {
  if (typeof config.bearer_token_env_var === "string") {
    return "bearerEnvironment";
  }
  return config.auth === "chatgpt" ? "chatgpt" : "oauth";
}

// "auto" is Codex's default, so it maps to the "Codex Decides" option.
function isApprovalMode(
  value: unknown,
): value is "prompt" | "writes" | "approve" {
  return value === "prompt" || value === "writes" || value === "approve";
}

function isAuthentication(
  value: string,
): value is NonNullable<McpServerFormValues["authentication"]> {
  return (
    value === "oauth" || value === "chatgpt" || value === "bearerEnvironment"
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getServerIcon(record: McpServerRecord) {
  if (record.authStatus === "notLoggedIn") {
    return { source: Icon.Key, tintColor: Color.Orange };
  }
  if (record.enabled === false) {
    return { source: Icon.Pause, tintColor: Color.SecondaryText };
  }
  if (!record.editable && record.config) {
    return { source: Icon.Lock, tintColor: Color.SecondaryText };
  }
  return mcpServerIcon;
}

function getStatusLabel(record: McpServerRecord): string {
  if (record.enabled === false) return "Disabled";
  if (record.config) return "Enabled";
  if (record.runtimeAvailable) return "Runtime discovered";
  return "Unknown";
}

function formatAuthStatus(
  authStatus: McpServerRecord["authStatus"],
  runtimeDetailsState: RuntimeDetailsState,
): string {
  switch (authStatus) {
    case "notLoggedIn":
      return "Sign in required";
    case "bearerToken":
      return "Bearer token";
    case "oAuth":
      return "OAuth";
    case "unknown":
    case "unsupported":
      return "Not reported";
    default:
      if (runtimeDetailsState === "loading") return "Loading from Codex";
      if (runtimeDetailsState === "loaded") return "Not reported";
      return "Unavailable";
  }
}

function formatRuntimeStatus(status: McpServerRuntimeStatus): string {
  switch (status) {
    case "notStarted":
      return "Not started";
    case "starting":
      return "Starting";
    case "connected":
      return "Connected";
    case "authenticationRequired":
      return "Sign in required";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "disabled":
      return "Disabled";
  }
}
