import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  deleteModel,
  fetchModelsStatus,
  formatBytes,
  formatModelName,
  isOmlxInstalled,
  isServerRunning,
  loadModel,
  unloadModel,
  updateModelSettings,
  type OmlxModelStatus,
} from "./lib/omlx";

function getDashboardUrl(): string {
  const { serverUrl } = getPreferenceValues<ExtensionPreferences>();
  return `${serverUrl.replace(/\/v1\/?$/, "")}/admin`;
}

type ViewState = "loading" | "not-installed" | "offline" | "ready";

export default function ManageModels() {
  const [models, setModels] = useState<OmlxModelStatus[]>([]);
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
      const data = await fetchModelsStatus();
      setModels(data.filter((m) => !m.is_helper));
      setViewState("ready");
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

  const loaded = models.filter((m) => m.loaded);
  const available = models.filter((m) => !m.loaded && !m.is_loading);
  const loading = models.filter((m) => m.is_loading);

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
          {!model.loaded && !model.is_loading && (
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
          {model.loaded && (
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
          <Action.CopyToClipboard title="Copy Name" content={model.id} />
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url={getDashboardUrl()}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
          />
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
