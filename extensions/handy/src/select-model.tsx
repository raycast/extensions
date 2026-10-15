import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getDownloadedModels, ModelInfo } from "./lib/models";
import { readSettings, writeSettings } from "./lib/settings";
import { selectModelInHandy } from "./lib/handy";
import { applyLiveOrRestart } from "./lib/apply-selection";

export default function SelectModel() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      setModels(getDownloadedModels());
      setCurrentId(readSettings().selected_model);
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
      await applyLiveOrRestart({
        isCurrent: model.id === currentId,
        alreadyActiveMessage: `${model.name} is already active`,
        persist: () => writeSettings({ selected_model: model.id }),
        markCurrent: () => setCurrentId(model.id),
        liveSwitch: () => selectModelInHandy(model.name),
        successMessage: `Model changed to ${model.name}`,
        failureTitle: "Couldn't switch model in Handy",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change model",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models...">
      {models.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No models downloaded"
          description="Open Handy and download a model first"
        />
      ) : (
        models.map((model) => (
          <List.Item
            key={model.id}
            title={model.name}
            subtitle={model.description}
            accessories={[
              ...(model.quant ? [{ tag: model.quant }] : []),
              ...(model.id === currentId
                ? [{ text: "Active", icon: Icon.Checkmark }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select Model"
                  icon={Icon.Checkmark}
                  onAction={() => handleSelect(model)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
