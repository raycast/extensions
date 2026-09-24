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
  fetchModelsStatus,
  fetchServerStatus,
  formatBytes,
  formatModelName,
  isOmlxInstalled,
  isServerRunning,
  formatUptime,
  unloadModel,
  updateModelSettings,
  type OmlxModelStatus,
  type OmlxServerStatus,
} from "./lib/omlx";

type ViewState = "loading" | "not-installed" | "offline" | "error" | "ready";

export default function ServingStats() {
  const [status, setStatus] = useState<OmlxServerStatus | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function loadStatus() {
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
      const data = await fetchServerStatus();
      setStatus(data);
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

  useEffect(() => {
    loadStatus();
  }, []);

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadStatus}
      />
      <Action.OpenInBrowser
        title="Open Web Dashboard"
        url="http://127.0.0.1:8000/admin"
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
  if (!s) return <List isLoading />;

  const totalTokens = n(s.total_prompt_tokens) + n(s.total_completion_tokens);
  const memoryPercent =
    s.model_memory_max > 0
      ? Math.round((s.model_memory_used / s.model_memory_max) * 100)
      : 0;

  return (
    <List isLoading={viewState === "loading"}>
      <List.Section title="Speed">
        <List.Item
          icon={Icon.Bolt}
          title="Prompt Processing"
          accessories={[{ text: `${n(s.avg_prefill_tps).toFixed(1)} tok/s` }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Bolt}
          title="Token Generation"
          accessories={[
            { text: `${n(s.avg_generation_tps).toFixed(1)} tok/s` },
          ]}
          actions={actions}
        />
      </List.Section>

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
          accessories={[{ text: formatTokens(n(s.total_cached_tokens)) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Gauge}
          title="Cache Efficiency"
          accessories={[
            {
              tag: {
                value: `${n(s.cache_efficiency).toFixed(1)}%`,
                color:
                  n(s.cache_efficiency) > 50
                    ? Color.Green
                    : n(s.cache_efficiency) > 20
                      ? Color.Yellow
                      : Color.SecondaryText,
              },
            },
          ]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Memory">
        <List.Item
          icon={Icon.MemoryChip}
          title="Model Memory"
          accessories={[
            {
              text: `${s.model_memory_used_formatted} / ${s.model_memory_max_formatted}`,
            },
            {
              tag: {
                value: `${memoryPercent}%`,
                color:
                  memoryPercent > 80
                    ? Color.Red
                    : memoryPercent > 50
                      ? Color.Yellow
                      : Color.Green,
              },
            },
          ]}
          actions={actions}
        />
      </List.Section>

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
                    title="View Model Details"
                    icon={Icon.Eye}
                    target={<ModelDetail modelId={m} onBack={loadStatus} />}
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
                    icon={Icon.Pin}
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
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadStatus}
                  />
                  <Action.OpenInBrowser
                    title="Open Web Dashboard"
                    url="http://127.0.0.1:8000/admin"
                  />
                  <Action.CopyToClipboard title="Copy Model Id" content={m} />
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

      <List.Section title="Requests">
        <List.Item
          icon={Icon.Network}
          title="Total"
          accessories={[{ text: n(s.total_requests).toLocaleString() }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Clock}
          title="Active / Waiting"
          accessories={[
            { text: `${n(s.active_requests)} / ${n(s.waiting_requests)}` },
          ]}
          actions={actions}
        />
      </List.Section>

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
          {m.pinned && <Detail.Metadata.Label title="Pinned" icon={Icon.Pin} />}
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

          <Detail.Metadata.Label title="Path" text={m.model_path} />
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
            icon={Icon.Pin}
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
          <Action.OpenInBrowser
            title="Open Web Dashboard"
            url="http://127.0.0.1:8000/admin"
          />
          <Action.CopyToClipboard title="Copy Model Id" content={m.id} />
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
