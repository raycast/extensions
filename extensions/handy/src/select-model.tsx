import {
  Action,
  ActionPanel,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getDownloadedModels, ModelInfo } from "./lib/models";
import { readSettings, writeSettings } from "./lib/settings";
import { applySettingsAndReload, selectModelInHandy } from "./lib/handy";

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
      if (model.id === currentId) {
        await showHUD(`${model.name} is already active`);
        return;
      }
      const { handyBinaryPath } = getPreferenceValues<Preferences>();
      writeSettings({ selected_model: model.id });
      setCurrentId(model.id);
      const applied = await selectModelInHandy(model.name);
      if (applied) {
        await showHUD(`Model changed to ${model.name}`);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't switch model in Handy",
          message:
            "Grant Raycast Accessibility access (System Settings → Privacy & Security), or restart Handy to apply.",
          primaryAction: {
            title: "Restart Handy",
            onAction: () =>
              applySettingsAndReload(
                () => writeSettings({ selected_model: model.id }),
                handyBinaryPath,
              ),
          },
        });
      }
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
