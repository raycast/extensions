import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  type AdminStats,
  checkForUpdate,
  fetchAdminStats,
  fetchLogs,
  fetchModelsStatus,
  fetchServerStatus,
  formatBytes,
  formatModelName,
  getDashboardUrl,
  isOmlxInstalled,
  isServerRunning,
  formatUptime,
  unloadModel,
  updateModelSettings,
  type OmlxModelStatus,
  type OmlxServerStatus,
  type UpdateCheckResponse,
} from "./lib/omlx";

type ViewState = "loading" | "not-installed" | "offline" | "error" | "ready";

type StatsScope = "session" | "alltime";

export default function ServingStats() {
  const [status, setStatus] = useState<OmlxServerStatus | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [scope, setScope] = useState<StatsScope>("session");
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(
    null,
  );
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function loadStatus(statsScope?: StatsScope) {
    setViewState("loading");
    setErrorMessage("");

    if (!isOmlxInstalled()) {
      setViewState("not-installed");
      return;
    }

    try {
      const running = await isServerRunning();
      if (!running) {
        setViewState("offline");
        return;
      }
      const [serverData, statsData] = await Promise.all([
        fetchServerStatus(),
        fetchAdminStats(statsScope ?? scope),
      ]);
      setStatus(serverData);
      setStats(statsData);
      checkForUpdate()
        .then(setUpdateInfo)
        .catch(() => {});
      setViewState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      setViewState("error");
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function onScopeChange(newScope: string) {
    const s = newScope as StatsScope;
    setScope(s);
    loadStatus(s);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Web Dashboard"
        url={getDashboardUrl({ tab: "status" })}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadStatus}
      />
      <Action.Push
        title="View Logs"
        icon={Icon.Terminal}
        target={<LogsView />}
      />
    </ActionPanel>
  );

  if (viewState === "not-installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="oMLX Not Found"
          description="Install oMLX from omlx.com, then launch it once."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download oMLX"
                url="https://omlx.com"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (viewState === "offline") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="oMLX Server Offline"
          description="Start the server with Start/Stop Server."
          actions={actions}
        />
      </List>
    );
  }

  if (viewState === "error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Fetch Stats"
          description={errorMessage}
          actions={actions}
        />
      </List>
    );
  }

  const s = status;
  const st = stats;
  if (!s || !st) return <List isLoading />;

  const totalTokens = n(st.total_prompt_tokens) + n(st.total_completion_tokens);
  const mp = st.active_models?.memory_pressure;
  const rc = st.runtime_cache;

  return (
    <List
      isLoading={viewState === "loading"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Stats Scope"
          value={scope}
          onChange={onScopeChange}
        >
          <List.Dropdown.Item title="Session" value="session" />
          <List.Dropdown.Item title="All Time" value="alltime" />
        </List.Dropdown>
      }
    >
      <List.Section title="Cache">
        <List.Item
          icon={Icon.Document}
          title="Total Tokens Processed"
          accessories={[{ text: formatTokens(totalTokens) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Document}
          title="Cached Tokens"
          accessories={[{ text: formatTokens(n(st.total_cached_tokens)) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Gauge}
          title="Cache Efficiency"
          accessories={[
            {
              tag: {
                value: `${n(st.cache_efficiency).toFixed(1)}%`,
                color:
                  n(st.cache_efficiency) > 50
                    ? Color.Green
                    : n(st.cache_efficiency) > 20
                      ? Color.Yellow
                      : Color.SecondaryText,
              },
            },
          ]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Speed">
        <List.Item
          icon={Icon.Bolt}
          title="Prompt Processing"
          accessories={[{ text: `${n(st.avg_prefill_tps).toFixed(1)} tok/s` }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Bolt}
          title="Token Generation"
          accessories={[
            { text: `${n(st.avg_generation_tps).toFixed(1)} tok/s` },
          ]}
          actions={actions}
        />
      </List.Section>

      {mp && (
        <List.Section title="Memory">
          <List.Item
            icon={Icon.MemoryChip}
            title="Model Memory"
            accessories={[
              {
                text: `${mp.current_formatted} / ${mp.soft_formatted} soft / ${mp.hard_formatted} hard`,
              },
              {
                tag: {
                  value: `${mp.hard_bytes > 0 ? Math.round((mp.current_bytes / mp.hard_bytes) * 100) : 0}%`,
                  color:
                    mp.current_bytes / mp.soft_bytes > 0.8
                      ? Color.Red
                      : mp.current_bytes / mp.soft_bytes > 0.5
                        ? Color.Yellow
                        : Color.Green,
                },
              },
            ]}
            actions={actions}
          />
        </List.Section>
      )}

      <List.Section title="Active Models">
        {s.loaded_models.length > 0 ? (
          s.loaded_models.map((m) => (
            <List.Item
              key={m}
              icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
              title={m}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Model Stats"
                    icon={Icon.BarChart}
                    target={<ModelStats modelId={m} scope={scope} />}
                  />
                  <Action
                    title="Eject Model"
                    icon={Icon.Eject}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: `Ejecting ${m}...`,
                      });
                      try {
                        await unloadModel(m);
                        toast.style = Toast.Style.Success;
                        toast.title = "Model ejected";
                        await loadStatus();
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to eject";
                        toast.message =
                          error instanceof Error
                            ? error.message
                            : "Unknown error";
                      }
                    }}
                  />
                  <Action
                    title="Pin to Memory"
                    icon={Icon.Tack}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    onAction={async () => {
                      const toast = await showToast({
                        style: Toast.Style.Animated,
                        title: "Pinning...",
                      });
                      try {
                        await updateModelSettings(m, { is_pinned: true });
                        toast.style = Toast.Style.Success;
                        toast.title = "Pinned to memory";
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Failed to pin";
                        toast.message =
                          error instanceof Error
                            ? error.message
                            : "Unknown error";
                      }
                    }}
                  />
                  <Action.Push
                    title="View Model Details"
                    icon={Icon.Eye}
                    target={<ModelDetail modelId={m} onBack={loadStatus} />}
                  />
                  <Action.OpenInBrowser
                    title="Open Web Dashboard"
                    url={getDashboardUrl({ tab: "status" })}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadStatus}
                  />
                  <Action.CopyToClipboard title="Copy Name" content={m} />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item
            icon={Icon.Circle}
            title="No models loaded"
            actions={actions}
          />
        )}
      </List.Section>

      {rc && rc.disk_max_bytes > 0 && (
        <List.Section title="SSD Cache">
          <List.Item
            icon={Icon.HardDrive}
            title="Disk Usage"
            accessories={[
              {
                text: `${formatBytes(rc.total_size_bytes)} / ${formatBytes(rc.disk_max_bytes)}`,
              },
              {
                tag: {
                  value: `${Math.round((rc.total_size_bytes / rc.disk_max_bytes) * 100)}%`,
                  color:
                    rc.total_size_bytes / rc.disk_max_bytes > 0.8
                      ? Color.Red
                      : rc.total_size_bytes / rc.disk_max_bytes > 0.5
                        ? Color.Yellow
                        : Color.Green,
                },
              },
            ]}
            actions={actions}
          />
          <List.Item
            icon={Icon.Document}
            title="Cache Files"
            accessories={[{ text: rc.total_num_files.toLocaleString() }]}
            actions={actions}
          />
        </List.Section>
      )}

      <List.Section title="Server">
        <List.Item
          icon={Icon.Info}
          title={`v${s.version}`}
          accessories={[
            { text: `Up ${formatUptime(s.uptime_seconds)}` },
            { text: `Default: ${s.default_model || "—"}` },
          ]}
          actions={actions}
        />
        {updateInfo?.update_available && (
          <List.Item
            icon={{ source: Icon.ArrowUp, tintColor: Color.Orange }}
            title="Update Available"
            accessories={[
              {
                tag: {
                  value: updateInfo.latest_version ?? "New version",
                  color: Color.Orange,
                },
              },
            ]}
            actions={
              <ActionPanel>
                {updateInfo.release_url && (
                  <Action.OpenInBrowser
                    title="View Release"
                    url={updateInfo.release_url}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadStatus}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

function ModelDetail({
  modelId,
  onBack,
}: {
  modelId: string;
  onBack: () => Promise<void>;
}) {
  const [model, setModel] = useState<OmlxModelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const models = await fetchModelsStatus();
        setModel(models.find((m) => m.id === modelId) ?? null);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch model details",
        });
      }
      setIsLoading(false);
    })();
  }, [modelId]);

  if (!model) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={isLoading ? "" : `Model "${modelId}" not found.`}
      />
    );
  }

  const m = model;
  const status = m.is_loading
    ? "Loading..."
    : m.loaded
      ? "Loaded"
      : "Available";

  const capabilities = [
    m.model_type === "vlm" ? "Vision" : null,
    m.thinking_default ? "Thinking" : null,
  ].filter(Boolean);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${formatModelName(m.id)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          {m.pinned && (
            <Detail.Metadata.Label title="Pinned" icon={Icon.Tack} />
          )}
          <Detail.Metadata.Label
            title="Type"
            text={`${m.model_type.toUpperCase()} (${m.config_model_type})`}
          />
          <Detail.Metadata.Label title="Engine" text={m.engine_type} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Size"
            text={formatBytes(m.estimated_size)}
          />
          {m.loaded && m.actual_size != null && (
            <Detail.Metadata.Label
              title="In Memory"
              text={formatBytes(m.actual_size)}
            />
          )}
          <Detail.Metadata.Label
            title="Context Window"
            text={`${m.max_context_window.toLocaleString()} tokens`}
          />
          <Detail.Metadata.Label
            title="Max Output"
            text={`${m.max_tokens.toLocaleString()} tokens`}
          />

          {capabilities.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Capabilities">
                {capabilities.map((c) => (
                  <Detail.Metadata.TagList.Item
                    key={c}
                    text={c!}
                    color={c === "Vision" ? Color.Purple : Color.Blue}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Path"
            text={m.model_path.replace(/^\/Users\/[^/]+/, "~")}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {m.loaded && (
            <Action
              title="Eject Model"
              icon={Icon.Eject}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Ejecting ${m.id}...`,
                });
                try {
                  await unloadModel(m.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Model ejected";
                  await onBack();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          <Action
            title={m.pinned ? "Unpin from Memory" : "Pin to Memory"}
            icon={Icon.Tack}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: m.pinned ? "Unpinning..." : "Pinning...",
              });
              try {
                await updateModelSettings(m.id, { is_pinned: !m.pinned });
                toast.style = Toast.Style.Success;
                toast.title = m.pinned ? "Unpinned" : "Pinned";
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
          <Action.CopyToClipboard title="Copy Name" content={m.id} />
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl({ tab: "status" })}
          />
        </ActionPanel>
      }
    />
  );
}

function ModelStats({
  modelId,
  scope: initialScope,
}: {
  modelId: string;
  scope: StatsScope;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchAdminStats(initialScope, modelId);
      setStats(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch model stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (!stats) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const totalTokens =
    n(stats.total_prompt_tokens) + n(stats.total_completion_tokens);
  const markdown = `# ${formatModelName(modelId)}\n\n*${initialScope === "alltime" ? "All Time" : "Session"} stats*`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Prompt Processing"
            text={`${n(stats.avg_prefill_tps).toFixed(1)} tok/s`}
          />
          <Detail.Metadata.Label
            title="Token Generation"
            text={`${n(stats.avg_generation_tps).toFixed(1)} tok/s`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Requests"
            text={n(stats.total_requests).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Tokens Processed"
            text={formatTokens(totalTokens)}
          />
          <Detail.Metadata.Label
            title="Cached Tokens"
            text={formatTokens(n(stats.total_cached_tokens))}
          />
          <Detail.Metadata.Label
            title="Cache Efficiency"
            text={`${n(stats.cache_efficiency).toFixed(1)}%`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
        </ActionPanel>
      }
    />
  );
}

function LogsView() {
  const [logs, setLogs] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchLogs();
      setLogs(data.logs);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch logs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={"```\n" + logs + "\n```"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={load} />
          <Action.OpenInBrowser
            title="Open Logs in Dashboard"
            url={getDashboardUrl({ tab: "logs" })}
          />
        </ActionPanel>
      }
    />
  );
}

function n(val: number | undefined): number {
  return val ?? 0;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}
