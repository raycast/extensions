import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { apiGet, apiPost, errorMessage } from "./api";
import type { ModelEntry, ModelsResponse } from "./types";

// Loading can include a model download.
const LOAD_TIMEOUT_MS = 15 * 60 * 1000;

function groupByEngine(models: ModelEntry[]): [string, ModelEntry[]][] {
  const groups = new Map<string, ModelEntry[]>();
  for (const model of models) {
    groups.set(model.engine, [...(groups.get(model.engine) ?? []), model]);
  }
  // Show the engine in use first.
  return [...groups.entries()].sort(
    ([, a], [, b]) =>
      Number(b.some((model) => model.selected)) -
      Number(a.some((model) => model.selected)),
  );
}

function accessoriesFor(model: ModelEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (model.status === "not_configured") {
    accessories.push({ tag: { value: "Not set up", color: Color.Orange } });
  } else if (model.loaded) {
    accessories.push({ tag: { value: "Loaded", color: Color.Green } });
  } else if (model.downloaded) {
    accessories.push({ tag: "Downloaded" });
  }
  if (model.size_description) {
    accessories.push({ text: model.size_description });
  }
  return accessories;
}

export default function Command() {
  const { isLoading, data, revalidate } = usePromise(() =>
    apiGet<ModelsResponse>("/v1/models"),
  );

  async function selectModel(model: ModelEntry) {
    if (model.status === "not_configured") {
      await showToast({
        style: Toast.Style.Failure,
        title: `Set up ${model.engine} in TypeWhisper first`,
        message: "Open TypeWhisper Settings to add the API key or plugin.",
      });
      return;
    }

    // TypeWhisper for Windows loads only models that are already downloaded.
    if (process.platform === "win32" && model.downloaded === false) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Download ${model.name} in TypeWhisper first`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Loading ${model.name}…`,
      message: model.downloaded === false ? "Downloading first" : undefined,
    });
    try {
      await apiPost(
        "/v1/models/load",
        { engine: model.engine, model: model.id },
        {
          timeoutMs: LOAD_TIMEOUT_MS,
          timeoutMessage: "Loading the model took too long.",
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = `Using ${model.name}`;
      toast.message = undefined;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = errorMessage(error, "Failed to load model");
      toast.message = undefined;
    }
  }

  const groups = groupByEngine(data?.models ?? []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models...">
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No models available"
          description="Install a transcription engine in TypeWhisper Settings"
          icon={Icon.ComputerChip}
        />
      ) : (
        groups.map(([engine, models]) => (
          <List.Section key={engine} title={engine}>
            {models.map((model) => (
              <List.Item
                key={`${model.engine}-${model.id}`}
                title={model.name}
                subtitle={model.selected ? "In use" : undefined}
                keywords={[model.id, model.engine]}
                icon={
                  model.selected
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle
                }
                accessories={accessoriesFor(model)}
                actions={
                  <ActionPanel>
                    {!model.selected && (
                      <Action
                        title="Use This Model"
                        icon={Icon.Checkmark}
                        onAction={() => selectModel(model)}
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
                      onAction={() => revalidate()}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
