import {
  Action,
  ActionPanel,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getAllKnownModels, ModelInfo } from "./lib/models";
import { tryReadJSONPref, writeJSONPref } from "./lib/plist";

export default function SelectFileModel() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setModels(getAllKnownModels());
      setCurrentId(
        tryReadJSONPref<string>("fileTranscriptionVoiceModelID") ?? "",
      );
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load models",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(model: ModelInfo) {
    try {
      writeJSONPref("fileTranscriptionVoiceModelID", model.id);
      setCurrentId(model.id);
      await showHUD(`File transcription model: ${model.label}`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change model",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search file transcription models..."
    >
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
                  title="Use for File Transcription"
                  icon={Icon.Checkmark}
                  onAction={() => handleSelect(model)}
                />
                <Action.CopyToClipboard
                  title="Copy Model Id"
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
