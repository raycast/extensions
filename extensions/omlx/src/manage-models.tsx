import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  type AdminStats,
  deleteModel,
  fetchAdminStats,
  fetchLocalModels,
  fetchModelsStatus,
  formatBytes,
  formatModelName,
  getDashboardUrl,
  isOmlxInstalled,
  isServerRunning,
  notifyIfUpdateAvailable,
  reloadModels,
  loadModel,
  unloadModel,
  updateModelSettings,
  type HfLocalModel,
  type OmlxModelStatus,
} from "./lib/omlx";

type ViewState = "loading" | "not-installed" | "offline" | "ready";

export default function ManageModels() {
  const [models, setModels] = useState<OmlxModelStatus[]>([]);
  const [diskOnlyModels, setDiskOnlyModels] = useState<HfLocalModel[]>([]);
  const [viewState, setViewState] = useState<ViewState>("loading");

  const refresh = useCallback(async () => {
    setViewState("loading");

    if (!isOmlxInstalled()) {
      setViewState("not-installed");
      return;
    }

    const running = await isServerRunning();
    if (!running) {
      setViewState("offline");
      return;
    }

    try {
      const [apiModels, localModels] = await Promise.all([
        fetchModelsStatus(),
        fetchLocalModels(),
      ]);
      setModels(apiModels);
      const apiIds = new Set(apiModels.map((m) => m.id));
      setDiskOnlyModels(localModels.filter((m) => !apiIds.has(m.name)));
      setViewState("ready");
      notifyIfUpdateAvailable();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch models",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setViewState("ready");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
                title="Download Omlx"
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
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const loaded = models.filter((m) => m.loaded && !m.is_helper);
  const available = models.filter(
    (m) => !m.loaded && !m.is_loading && !m.is_helper,
  );
  const loading = models.filter((m) => m.is_loading);
  const helpers = models.filter((m) => m.is_helper);

  return (
    <List isLoading={viewState === "loading"} isShowingDetail>
      {loading.length > 0 && (
        <List.Section title="Loading">
          {loading.map((m) => (
            <ModelItem key={m.id} model={m} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {loaded.length > 0 && (
        <List.Section title="Loaded">
          {loaded.map((m) => (
            <ModelItem key={m.id} model={m} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {available.length > 0 && (
        <List.Section title="Available">
          {available.map((m) => (
            <ModelItem key={m.id} model={m} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {helpers.length > 0 && (
        <List.Section title="Helper">
          {helpers.map((m) => (
            <ModelItem key={m.id} model={m} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
      {diskOnlyModels.length > 0 && (
        <List.Section title="Other">
          {diskOnlyModels.map((m) => (
            <DiskModelItem key={m.name} model={m} onRefresh={refresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ModelItem({
  model,
  onRefresh,
}: {
  model: OmlxModelStatus;
  onRefresh: () => Promise<void>;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (model.is_favorite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  }
  if (model.pinned) {
    accessories.push({ icon: Icon.Tack, tooltip: "Pinned" });
  }

  return (
    <List.Item
      title={formatModelName(model.id)}
      icon={
        model.loaded
          ? { source: Icon.CircleFilled, tintColor: Color.Green }
          : Icon.Circle
      }
      accessories={accessories}
      keywords={[model.id, model.model_type, model.config_model_type]}
      detail={<ModelDetail model={model} />}
      actions={
        <ActionPanel>
          {!model.loaded && !model.is_loading && !model.is_helper && (
            <Action
              title="Load Model"
              icon={Icon.Download}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Loading ${model.id}...`,
                });
                try {
                  await loadModel(model.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Model loaded";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to load";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          {model.loaded && !model.is_helper && (
            <Action
              title="Eject Model"
              icon={Icon.Eject}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Ejecting ${model.id}...`,
                });
                try {
                  await unloadModel(model.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Model ejected";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to eject";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          {!model.is_helper && (
            <Action
              title={model.pinned ? "Unpin from Memory" : "Pin to Memory"}
              icon={Icon.Tack}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: model.pinned ? "Unpinning..." : "Pinning...",
                });
                try {
                  await updateModelSettings(model.id, {
                    is_pinned: !model.pinned,
                  });
                  toast.style = Toast.Style.Success;
                  toast.title = model.pinned ? "Unpinned" : "Pinned to memory";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
          {!model.is_helper && (
            <Action
              title={
                model.is_favorite ? "Remove from Favorites" : "Add to Favorites"
              }
              icon={Icon.Star}
              onAction={async () => {
                try {
                  await updateModelSettings(model.id, {
                    is_favorite: !model.is_favorite,
                  });
                  await onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed",
                    message:
                      error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
          )}
          {!model.is_helper && (
            <Action.Push
              title="View Model Stats"
              icon={Icon.BarChart}
              target={<ModelStatsView modelId={model.id} />}
            />
          )}
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl({ tab: "models", modelsTab: "manager" })}
          />
          <Action
            title="Reload Models"
            icon={Icon.RotateClockwise}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Reloading...",
              });
              try {
                const msg = await reloadModels();
                toast.style = Toast.Style.Success;
                toast.title = msg;
                await onRefresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to reload";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
          <Action.CopyToClipboard title="Copy Name" content={model.id} />
          {!model.is_helper && (
            <Action
              title="Delete Model"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Model",
                  message: `Delete "${model.id}" from disk? This cannot be undone.`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) return;
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Deleting ${model.id}...`,
                });
                try {
                  if (model.loaded) await unloadModel(model.id);
                  await deleteModel(model.id);
                  toast.style = Toast.Style.Success;
                  toast.title = "Model deleted";
                  await onRefresh();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to delete";
                  toast.message =
                    error instanceof Error ? error.message : "Unknown error";
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function ModelDetail({ model: m }: { model: OmlxModelStatus }) {
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
    <List.Item.Detail
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
    />
  );
}

function DiskModelItem({
  model,
  onRefresh,
}: {
  model: HfLocalModel;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Item
      title={model.display_name}
      icon={Icon.HardDrive}
      detail={
        <List.Item.Detail
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Size" text={model.size_formatted} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Path"
                text={model.path.replace(/^\/Users\/[^/]+/, "~")}
              />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Note"
                text="This model is on disk but not recognized by oMLX. It may be a partial download or need a server reload."
              />
            </Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Delete Model"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Delete Model",
                message: `Delete "${model.display_name}" from disk? This cannot be undone.`,
                primaryAction: {
                  title: "Delete",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!confirmed) return;
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: `Deleting ${model.name}...`,
              });
              try {
                await deleteModel(model.name);
                toast.style = Toast.Style.Success;
                toast.title = "Model deleted";
                await onRefresh();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to delete";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
          <Action.CopyToClipboard title="Copy Name" content={model.name} />
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl({ tab: "models", modelsTab: "manager" })}
          />
        </ActionPanel>
      }
    />
  );
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function ModelStatsView({ modelId }: { modelId: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setStats(await fetchAdminStats("session", modelId));
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

  if (!stats) return <Detail isLoading={isLoading} markdown="" />;

  const totalTokens =
    (stats.total_prompt_tokens ?? 0) + (stats.total_completion_tokens ?? 0);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${formatModelName(modelId)}\n\n*Session stats*`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Prompt Processing"
            text={`${(stats.avg_prefill_tps ?? 0).toFixed(1)} tok/s`}
          />
          <Detail.Metadata.Label
            title="Token Generation"
            text={`${(stats.avg_generation_tps ?? 0).toFixed(1)} tok/s`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Requests"
            text={(stats.total_requests ?? 0).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Tokens Processed"
            text={formatTokens(totalTokens)}
          />
          <Detail.Metadata.Label
            title="Cached Tokens"
            text={formatTokens(stats.total_cached_tokens ?? 0)}
          />
          <Detail.Metadata.Label
            title="Cache Efficiency"
            text={`${(stats.cache_efficiency ?? 0).toFixed(1)}%`}
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
