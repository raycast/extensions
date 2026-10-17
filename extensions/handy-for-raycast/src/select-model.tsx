import { Action, ActionPanel, Icon, List, open, showHUD, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { showFailure } from "./lib/errors";
import { formatBytes } from "./lib/format";
import { isHandyRunning } from "./lib/handy";
import { getDownloadedModels, modelDiskSize, ModelInfo } from "./lib/models";
import { HANDY_APP_PATH, MODELS_DIR } from "./lib/paths";
import { readSettings, updateSettings } from "./lib/settings";

export default function Command() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setModels(getDownloadedModels());
      setSelected(readSettings().selected_model ?? "");
    } catch (error) {
      await showFailure("Could not load Handy models", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function select(model: ModelInfo) {
    try {
      const languageUpdate = model.supportsLanguageSelection
        ? {}
        : { selected_language: model.languages?.[0] ?? "auto" };
      updateSettings({ selected_model: model.id, ...languageUpdate });
      setSelected(model.id);
      if (isHandyRunning()) {
        await showToast({
          style: Toast.Style.Success,
          title: `Saved ${model.name}`,
          message: "Restart Handy to apply the new model",
          primaryAction: { title: "Open Handy", onAction: () => open(HANDY_APP_PATH) },
        });
      } else {
        await showHUD(`Using ${model.name}`);
      }
    } catch (error) {
      await showFailure("Could not select model", error);
    }
  }
  return (
    <List isLoading={loading} searchBarPlaceholder="Search downloaded models…">
      {!loading && !models.length ? (
        <List.EmptyView
          icon={Icon.Download}
          title="No Downloaded Models"
          description="Open Handy → Models to download your first transcription model."
          actions={
            <ActionPanel>
              <Action title="Open Handy" icon={Icon.AppWindow} onAction={() => open(HANDY_APP_PATH)} />
            </ActionPanel>
          }
        />
      ) : (
        models.map((model) => (
          <List.Item
            key={model.id}
            icon={model.id === selected ? Icon.CheckCircle : Icon.Circle}
            title={model.name}
            subtitle={model.description}
            keywords={[model.id, model.filename]}
            accessories={[
              { tag: model.speed },
              ...(modelDiskSize(model) ? [{ text: formatBytes(modelDiskSize(model)) }] : []),
              ...(model.id === selected ? [{ text: "Active", icon: Icon.Checkmark }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={model.id === selected ? "Selected" : "Select Model"}
                  icon={Icon.Checkmark}
                  onAction={() => select(model)}
                />
                <Action.ShowInFinder
                  title="Show Model in Finder"
                  path={model.path ?? `${MODELS_DIR}/${model.filename}`}
                />
                <Action
                  title="Open Handy"
                  icon={Icon.AppWindow}
                  shortcut={Keyboard.Shortcut.Common.Open}
                  onAction={() => open(HANDY_APP_PATH)}
                />
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={load}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
