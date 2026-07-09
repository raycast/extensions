import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  getConfig,
  isConnectionError,
  listAllModels,
  loadModel,
  unloadModel,
} from "./lib/lmstudio";
import { ModelInfo } from "./lib/types";

const REFRESH_INTERVAL_MS = 10_000;

export default function ManageModels() {
  // Fetched fresh (no stale cache) and re-fetched on an interval so the list
  // always reflects what is actually on the server.
  const { data, isLoading, error, revalidate } = usePromise(
    async () => listAllModels(getConfig()),
    [],
  );

  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  async function run(action: "load" | "unload", model: ModelInfo) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        action === "load" ? `Loading ${model.id}…` : `Unloading ${model.id}…`,
    });
    try {
      if (action === "load") await loadModel(getConfig(), model.id);
      else {
        for (const instanceId of model.instanceIds) {
          await unloadModel(getConfig(), instanceId);
        }
      }
      toast.style = Toast.Style.Success;
      toast.title =
        action === "load" ? `Loaded ${model.id}` : `Unloaded ${model.id}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title =
        action === "load" ? "Failed to load model" : "Failed to unload model";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      revalidate();
    }
  }

  if (error && isConnectionError(error)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Plug}
          title="LM Studio is not running"
          description="Open the LM Studio app or run `lms server start`, then try again."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to reach LM Studio"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter models…">
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No models found"
        description="Download a model in the LM Studio app first."
      />
      {(data ?? []).map((model) => (
        <List.Item
          key={model.id}
          title={model.id}
          icon={
            model.loaded
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : Icon.Circle
          }
          accessories={
            model.loaded
              ? [{ tag: { value: "Loaded", color: Color.Green } }]
              : []
          }
          actions={
            <ActionPanel>
              {model.loaded ? (
                <Action
                  title="Unload Model"
                  icon={Icon.Eject}
                  onAction={() => run("unload", model)}
                />
              ) : (
                <Action
                  title="Load Model"
                  icon={Icon.Download}
                  onAction={() => run("load", model)}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Model ID"
                content={model.id}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
