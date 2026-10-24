import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getAllKnownModels, ModelInfo } from "./lib/models";
import { tryReadJSONPref, writeJSONPref } from "./lib/plist";

interface ModelSelection {
  models: ModelInfo[];
  currentId: string;
}

interface ModelListProps {
  prefKey: "transcriptionModelID" | "fileTranscriptionVoiceModelID";
  searchPlaceholder: string;
  selectTitle: string;
  hudMessage: (label: string) => string;
}

async function loadModelSelection(
  prefKey: ModelListProps["prefKey"],
): Promise<ModelSelection> {
  return {
    models: getAllKnownModels(),
    currentId: tryReadJSONPref<string>(prefKey) ?? "",
  };
}

export default function ModelList({
  prefKey,
  searchPlaceholder,
  selectTitle,
  hudMessage,
}: ModelListProps) {
  const {
    isLoading,
    data = { models: [], currentId: "" },
    mutate,
  } = useCachedPromise(loadModelSelection, [prefKey], {
    initialData: { models: [], currentId: "" },
    failureToastOptions: { title: "Could not load models" },
  });

  const { models, currentId } = data;

  async function handleSelect(model: ModelInfo) {
    try {
      await mutate(
        (async () => {
          writeJSONPref(prefKey, model.id);
        })(),
        {
          optimisticUpdate(selection) {
            return { ...selection, currentId: model.id };
          },
        },
      );
      await showHUD(hudMessage(model.label));
    } catch (err) {
      await showFailureToast(err, { title: "Failed to change model" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchPlaceholder}>
      {models.map((model) => {
        const accessories: List.Item.Accessory[] = [];
        if (!model.local) accessories.push({ tag: "cloud" });
        if (model.requiresAPIKey) accessories.push({ tag: "API key" });
        if (model.id === currentId)
          accessories.push({ text: "Active", icon: Icon.Checkmark });

        return (
          <List.Item
            key={model.id}
            title={model.label}
            subtitle={model.provider}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title={selectTitle}
                  icon={Icon.Checkmark}
                  onAction={() => handleSelect(model)}
                />
                <Action.CopyToClipboard
                  title="Copy Model ID"
                  content={model.id}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
