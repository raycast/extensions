import { Action, ActionPanel, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { showFailure } from "./lib/errors";
import { isHandyRunning } from "./lib/handy";
import { getLanguages, LanguageOption } from "./lib/languages";
import { MODELS, getDownloadedModels } from "./lib/models";
import { HANDY_APP_PATH } from "./lib/paths";
import { readSettings, updateSettings } from "./lib/settings";

export default function Command() {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selected, setSelected] = useState("auto");
  const [modelName, setModelName] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const settings = readSettings();
      const model =
        getDownloadedModels().find((item) => item.id === settings.selected_model) ??
        MODELS.find((item) => item.id === settings.selected_model);
      setModelName(model?.name ?? settings.selected_model ?? "current model");
      setSelected(settings.selected_language ?? "auto");
      setUnsupported(Boolean(model && !model.supportsLanguageSelection));
      setLanguages(
        model?.supportsLanguageSelection === false ? [] : getLanguages(model?.languages, model?.supportsAuto !== false),
      );
    } catch (error) {
      await showFailure("Could not load languages", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function select(language: LanguageOption) {
    try {
      updateSettings({ selected_language: language.code });
      setSelected(language.code);
      if (isHandyRunning()) {
        await showToast({
          style: Toast.Style.Success,
          title: `Saved ${language.name}`,
          message: "Restart Handy to apply the new language",
          primaryAction: { title: "Open Handy", onAction: () => open(HANDY_APP_PATH) },
        });
      } else {
        await showHUD(`Language: ${language.name}`);
      }
    } catch (error) {
      await showFailure("Could not change language", error);
    }
  }
  return (
    <List isLoading={loading} searchBarPlaceholder="Search languages…">
      {!loading && unsupported ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Language Selection Is Automatic"
          description={`${modelName} does not support manually choosing a language.`}
        />
      ) : (
        languages.map((language) => (
          <List.Item
            key={language.code}
            icon={language.code === "auto" ? Icon.Wand : Icon.Globe}
            title={language.nativeName}
            subtitle={language.nativeName === language.name ? language.code : language.name}
            accessories={
              language.code === selected ? [{ text: "Active", icon: Icon.Checkmark }] : [{ text: language.code }]
            }
            actions={
              <ActionPanel>
                <Action title="Select Language" icon={Icon.Checkmark} onAction={() => select(language)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
