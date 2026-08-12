import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddMcpServerInput,
  McpInventory,
  McpProvider,
  McpScope,
  McpServer,
  McpStatus,
  McpTransport,
  addMcpServer,
  loadMcpInventory,
  loginMcpServer,
  logoutMcpServer,
  mcpConfigPath,
  mcpConfigRevealPath,
  providerTitle,
  removeMcpServer,
  safeMcpConfiguration,
  scopeTitle,
  statusTitle,
  transportTitle,
} from "../lib/mcp";
import { providerIcon } from "../lib/presentation";
import { shortcut, useShortcutStore } from "../lib/shortcuts";

type McpFilter = "all" | `provider:${McpProvider}` | `status:${McpStatus}`;

interface McpManagerProps {
  workingDirectory?: string;
  initialProvider?: McpProvider;
}

const emptyInventory: McpInventory = { servers: [], errors: {}, checkedAt: 0 };
const statusFilters: McpStatus[] = ["connected", "configured", "needs-auth", "pending", "disabled", "error", "unknown"];

export function McpManager({ workingDirectory = homedir(), initialProvider }: McpManagerProps) {
  useShortcutStore();
  const initialFilter: McpFilter = initialProvider ? `provider:${initialProvider}` : "all";
  const [inventory, setInventory] = useState<McpInventory>(emptyInventory);
  const [filter, setFilter] = useState<McpFilter>(initialFilter);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const reload = useCallback(
    async (announce = false) => {
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const nextInventory = await loadMcpInventory(workingDirectory);
        setInventory(nextInventory);
        if (announce) {
          const failedProviders = Object.keys(nextInventory.errors).length;
          await showToast({
            style: failedProviders ? Toast.Style.Failure : Toast.Style.Success,
            title: failedProviders ? "MCP Inventory Partially Updated" : "MCP Inventory Updated",
            message: failedProviders ? "A provider did not respond." : `${nextInventory.servers.length} ${"servers"}`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load the MCP inventory.";
        setLoadError(message);
        if (announce)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Refresh",
            message,
          });
      } finally {
        setIsLoading(false);
      }
    },
    [workingDirectory],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredServers = useMemo(
    () => inventory.servers.filter((server) => matchesFilter(server, filter)),
    [filter, inventory.servers],
  );
  const defaultProvider = providerFromFilter(filter) || initialProvider || "codex";
  const visibleProviderErrors = providerErrorsForFilter(inventory, filter);
  const codexServers = filteredServers.filter((server) => server.provider === "codex");
  const claudeServers = filteredServers.filter((server) => server.provider === "claude");
  const hasVisibleContent = filteredServers.length > 0 || visibleProviderErrors.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={"Search servers, providers, transports, or status…"}
      searchBarAccessory={
        <List.Dropdown tooltip={"Filter MCPs"} value={filter} onChange={(value) => setFilter(value as McpFilter)}>
          <List.Dropdown.Item title={`${"All"} (${inventory.servers.length})`} value="all" icon={Icon.List} />
          <List.Dropdown.Section title={"Provider"}>
            <List.Dropdown.Item
              title={`Codex (${inventory.servers.filter((server) => server.provider === "codex").length})`}
              value="provider:codex"
              icon={providerIcon("codex")}
            />
            <List.Dropdown.Item
              title={`Claude (${inventory.servers.filter((server) => server.provider === "claude").length})`}
              value="provider:claude"
              icon={providerIcon("claude")}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title={"Status"}>
            {statusFilters.map((status) => (
              <List.Dropdown.Item
                key={status}
                title={`${statusTitle(status)} (${inventory.servers.filter((server) => server.status === status).length})`}
                value={`status:${status}`}
                icon={statusIcon(status)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!hasVisibleContent ? (
        <List.EmptyView
          icon={loadError ? Icon.ExclamationMark : Icon.Plug}
          title={loadError ? "Could Not Load MCPs" : "No Servers Match This Filter"}
          description={loadError || "Add a STDIO or HTTP server, or change the current filter."}
          actions={
            <ActionPanel>
              <ManagerActions
                defaultProvider={defaultProvider}
                workingDirectory={workingDirectory}
                onRefresh={() => reload(true)}
              />
            </ActionPanel>
          }
        />
      ) : null}

      <McpServerSection
        title="Codex"
        servers={codexServers}
        defaultProvider="codex"
        workingDirectory={workingDirectory}
        onRefresh={reload}
      />
      <McpServerSection
        title="Claude"
        servers={claudeServers}
        defaultProvider="claude"
        workingDirectory={workingDirectory}
        onRefresh={reload}
      />
      {visibleProviderErrors.length > 0 ? (
        <List.Section title={"Check Problems"} subtitle={`${visibleProviderErrors.length}`}>
          {visibleProviderErrors.map(([provider, message]) => (
            <List.Item
              key={provider}
              id={`error:${provider}`}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={providerTitle(provider)}
              subtitle={"Unavailable"}
              detail={
                <List.Item.Detail
                  markdown={`## ${providerTitle(provider)} ${"Did Not Respond"}\n\n${escapeMarkdown(message)}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title={"Provider"} text={providerTitle(provider)} />
                      <List.Item.Detail.Metadata.Label title={"Status"} text={{ value: "Error", color: Color.Red }} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ManagerActions
                    defaultProvider={provider}
                    workingDirectory={workingDirectory}
                    onRefresh={() => reload(true)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function McpServerSection({
  title,
  servers,
  defaultProvider,
  workingDirectory,
  onRefresh,
}: {
  title: string;
  servers: McpServer[];
  defaultProvider: McpProvider;
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
}) {
  if (servers.length === 0) return null;
  return (
    <List.Section title={title} subtitle={`${servers.length}`}>
      {servers.map((server) => (
        <McpServerItem
          key={server.id}
          server={server}
          defaultProvider={defaultProvider}
          workingDirectory={workingDirectory}
          onRefresh={onRefresh}
        />
      ))}
    </List.Section>
  );
}

function McpServerItem({
  server,
  defaultProvider,
  workingDirectory,
  onRefresh,
}: {
  server: McpServer;
  defaultProvider: McpProvider;
  workingDirectory: string;
  onRefresh: (announce?: boolean) => Promise<void>;
}) {
  const configurationPath = mcpConfigPath(server);
  const canAuthenticate = server.transport === "http" || server.status === "needs-auth";

  const performOperation = async (operation: () => Promise<void>, progressTitle: string, successTitle: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: progressTitle, message: server.name });
    try {
      await operation();
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
      await onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "MCP Operation Failed";
      toast.message = error instanceof Error ? error.message : "The CLI could not complete the operation.";
    }
  };

  const removeServer = async () => {
    const confirmed = await confirmAlert({
      title: `${"Remove"} ${server.name}`,
      message: `${"This server will be removed from"} ${providerTitle(server.provider)}${
        server.scope ? ` · ${scopeTitle(server.scope)}` : ""
      }.`,
      primaryAction: { title: "Remove MCP", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await performOperation(() => removeMcpServer(server), "Removing MCP Server…", "MCP Server Removed");
  };

  return (
    <List.Item
      id={server.id}
      icon={providerIcon(server.provider)}
      title={server.name}
      subtitle={transportTitle(server.transport)}
      keywords={[
        providerTitle(server.provider),
        server.statusLabel,
        transportTitle(server.transport),
        server.scope ? scopeTitle(server.scope) : "",
        server.command || "",
        server.url || "",
      ]}
      accessories={[
        ...(server.scope ? [{ text: scopeTitle(server.scope), tooltip: "Claude scope" }] : []),
        { tag: { value: server.statusLabel, color: statusColor(server.status) }, icon: statusIcon(server.status) },
      ]}
      detail={<McpServerDetail server={server} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={"Server"}>
            <Action.CopyToClipboard
              title={"Copy Safe Configuration"}
              icon={Icon.Clipboard}
              content={safeMcpConfiguration(server)}
            />
            <Action.CopyToClipboard title={"Copy Name"} icon={Icon.CopyClipboard} content={server.name} />
          </ActionPanel.Section>
          {canAuthenticate ? (
            <ActionPanel.Section title={"Authentication"}>
              <Action
                title={"Log in to MCP"}
                icon={Icon.PersonCircle}
                onAction={() =>
                  performOperation(
                    () => loginMcpServer(server),
                    "Waiting For Browser Authentication…",
                    "MCP Authentication Complete",
                  )
                }
              />
              <Action
                title={"Log out of MCP"}
                icon={Icon.Lock}
                onAction={() =>
                  performOperation(() => logoutMcpServer(server), "Logging Out Of MCP…", "MCP Session Closed")
                }
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title={"Manage"}>
            <Action.Push
              title={"Add MCP Server"}
              icon={Icon.Plus}
              shortcut={shortcut("manager.new")}
              target={
                <AddMcpServerForm
                  defaultProvider={defaultProvider}
                  defaultWorkingDirectory={workingDirectory}
                  onAdded={onRefresh}
                />
              }
            />
            <Action
              title={"Refresh Servers"}
              icon={Icon.ArrowClockwise}
              shortcut={shortcut("common.refresh")}
              onAction={() => onRefresh(true)}
            />
            <Action
              title={"Remove MCP Server"}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={removeServer}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={"Configuration"}>
            {existsSync(configurationPath) ? (
              <Action.Open title={"Open Configuration File"} icon={Icon.Document} target={configurationPath} />
            ) : null}
            <Action.ShowInFinder
              title={"Show Configuration in Finder"}
              icon={Icon.Finder}
              path={mcpConfigRevealPath(server)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function McpServerDetail({ server }: { server: McpServer }) {
  const checkedAt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(
    server.checkedAt,
  );
  return (
    <List.Item.Detail
      markdown={[
        `## ${escapeMarkdown(server.name)}`,
        "",
        server.summary ? escapeMarkdown(server.summary) : "MCP configuration read through the official CLI.",
        "",
        "Environment-variable, header, and credential values are never shown.",
      ].join("\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Provider"} text={providerTitle(server.provider)} />
          <List.Item.Detail.Metadata.Label
            title={"Status"}
            text={{ value: server.statusLabel, color: statusColor(server.status) }}
          />
          <List.Item.Detail.Metadata.Label title={"Transport"} text={transportTitle(server.transport)} />
          {server.scope ? <List.Item.Detail.Metadata.Label title={"Scope"} text={scopeTitle(server.scope)} /> : null}
          {server.command ? <List.Item.Detail.Metadata.Label title={"Executable"} text={server.command} /> : null}
          {server.arguments?.length ? (
            <List.Item.Detail.Metadata.Label title={"Arguments"} text={server.arguments.join(" ")} />
          ) : null}
          {server.url ? <List.Item.Detail.Metadata.Label title="URL" text={server.url} /> : null}
          {server.cwd ? <List.Item.Detail.Metadata.Label title={"Directory"} text={server.cwd} /> : null}
          {server.environmentNames.length ? (
            <List.Item.Detail.Metadata.Label
              title={"Environment Variables"}
              text={server.environmentNames.join(", ")}
            />
          ) : null}
          {server.headerNames.length ? (
            <List.Item.Detail.Metadata.Label title={"Headers"} text={server.headerNames.join(", ")} />
          ) : null}
          {server.bearerTokenEnvironmentName ? (
            <List.Item.Detail.Metadata.Label title={"Token Variable"} text={server.bearerTokenEnvironmentName} />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={"Checked"} text={checkedAt} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ManagerActions({
  defaultProvider,
  workingDirectory,
  onRefresh,
}: {
  defaultProvider: McpProvider;
  workingDirectory: string;
  onRefresh: () => Promise<void>;
}) {
  const codexConfiguration = mcpConfigPath("codex", undefined, workingDirectory);
  const claudeConfiguration = mcpConfigPath("claude", "user", workingDirectory);
  return (
    <>
      <Action.Push
        title={"Add MCP Server"}
        icon={Icon.Plus}
        shortcut={shortcut("manager.new")}
        target={
          <AddMcpServerForm
            defaultProvider={defaultProvider}
            defaultWorkingDirectory={workingDirectory}
            onAdded={onRefresh}
          />
        }
      />
      <Action
        title={"Refresh Servers"}
        icon={Icon.ArrowClockwise}
        shortcut={shortcut("common.refresh")}
        onAction={onRefresh}
      />
      {existsSync(codexConfiguration) ? (
        <Action.Open title={"Open Codex Configuration"} icon={providerIcon("codex")} target={codexConfiguration} />
      ) : null}
      {existsSync(claudeConfiguration) ? (
        <Action.Open title={"Open Claude Configuration"} icon={providerIcon("claude")} target={claudeConfiguration} />
      ) : null}
    </>
  );
}

interface AddMcpFormValues {
  name: string;
  command: string;
  arguments: string;
  url: string;
  workingDirectory?: string;
}

function AddMcpServerForm({
  defaultProvider,
  defaultWorkingDirectory,
  onAdded,
}: {
  defaultProvider: McpProvider;
  defaultWorkingDirectory: string;
  onAdded: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [provider, setProvider] = useState<McpProvider>(defaultProvider);
  const [transport, setTransport] = useState<Exclude<McpTransport, "unknown">>("stdio");
  const [scope, setScope] = useState<McpScope>("local");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (values: AddMcpFormValues) => {
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding MCP Server…",
    });
    const input: AddMcpServerInput = {
      provider,
      transport,
      scope,
      name: values.name,
      command: values.command,
      argumentsText: values.arguments,
      url: values.url,
      workingDirectory:
        provider === "claude" && scope !== "user"
          ? values.workingDirectory || defaultWorkingDirectory
          : defaultWorkingDirectory,
    };

    try {
      await addMcpServer(input);
      toast.style = Toast.Style.Success;
      toast.title = "MCP Server Added";
      toast.message = values.name.trim();
      pop();
      await onAdded();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Add The MCP Server";
      toast.message = error instanceof Error ? error.message : "The CLI could not complete the operation.";
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={"Add MCP Server"}
      actions={
        <ActionPanel>
          <Action.SubmitForm<AddMcpFormValues> title={"Add MCP Server"} icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="provider"
        title={"Provider"}
        value={provider}
        onChange={(value) => setProvider(value as McpProvider)}
      >
        <Form.Dropdown.Item title="Codex" value="codex" icon={providerIcon("codex")} />
        <Form.Dropdown.Item title="Claude" value="claude" icon={providerIcon("claude")} />
      </Form.Dropdown>
      <Form.Dropdown
        id="transport"
        title={"Transport"}
        value={transport}
        onChange={(value) => setTransport(value as Exclude<McpTransport, "unknown">)}
      >
        <Form.Dropdown.Item title="STDIO" value="stdio" icon={Icon.Terminal} />
        <Form.Dropdown.Item title="HTTP" value="http" icon={Icon.Globe} />
      </Form.Dropdown>
      {provider === "claude" ? (
        <Form.Dropdown
          id="scope"
          title={"Claude Scope"}
          value={scope}
          onChange={(value) => setScope(value as McpScope)}
        >
          <Form.Dropdown.Item title="Local" value="local" />
          <Form.Dropdown.Item title={"User"} value="user" />
          <Form.Dropdown.Item title={"Project"} value="project" />
        </Form.Dropdown>
      ) : null}
      <Form.Separator />
      <Form.TextField id="name" title={"Name"} placeholder="my-server" autoFocus />
      {transport === "stdio" ? (
        <>
          <Form.TextField id="command" title={"Executable"} placeholder="npx" />
          <Form.TextField
            id="arguments"
            title={"Arguments"}
            placeholder="-y @modelcontextprotocol/server-filesystem /path"
          />
        </>
      ) : (
        <Form.TextField id="url" title="URL HTTP" placeholder="https://mcp.example.com/mcp" />
      )}
      {provider === "claude" && scope !== "user" ? (
        <Form.TextField
          id="workingDirectory"
          title={"Project Directory"}
          defaultValue={defaultWorkingDirectory}
          placeholder={"/path/to/project"}
        />
      ) : null}
      <Form.Description
        title={"Security"}
        text={
          "The manager never requests or displays environment-variable, header, token, or credential values. Add them later through the official configuration when needed."
        }
      />
    </Form>
  );
}

function matchesFilter(server: McpServer, filter: McpFilter): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("provider:")) return server.provider === filter.slice("provider:".length);
  return server.status === filter.slice("status:".length);
}

function providerFromFilter(filter: McpFilter): McpProvider | undefined {
  if (filter === "provider:codex") return "codex";
  if (filter === "provider:claude") return "claude";
  return undefined;
}

function providerErrorsForFilter(inventory: McpInventory, filter: McpFilter): Array<[McpProvider, string]> {
  if (filter.startsWith("status:")) return [];
  const provider = providerFromFilter(filter);
  return (Object.entries(inventory.errors) as Array<[McpProvider, string]>).filter(
    ([errorProvider]) => !provider || provider === errorProvider,
  );
}

function statusIcon(status: McpStatus): Icon {
  if (status === "connected") return Icon.CheckCircle;
  if (status === "configured") return Icon.Gear;
  if (status === "needs-auth") return Icon.Lock;
  if (status === "pending") return Icon.Clock;
  if (status === "disabled") return Icon.Pause;
  if (status === "error") return Icon.XMarkCircle;
  return Icon.QuestionMark;
}

function statusColor(status: McpStatus): Color {
  if (status === "connected") return Color.Green;
  if (status === "configured") return Color.Blue;
  if (status === "needs-auth" || status === "pending") return Color.Yellow;
  if (status === "error") return Color.Red;
  return Color.SecondaryText;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/gu, "\\$&");
}
