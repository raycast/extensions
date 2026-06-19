import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getLanguagesForModel, LanguageOption } from "./lib/languages";
import { MODEL_REGISTRY } from "./lib/models";
import { readSettings, writeSettings } from "./lib/settings";

export default function SelectLanguage() {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [currentCode, setCurrentCode] = useState("auto");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      const settings = readSettings();
      const modelId = settings.selected_model;
      const model = MODEL_REGISTRY.find((m) => m.id === modelId);

      // Model found and explicitly does not support language selection
      if (model && !model.supportsLanguageSelection) {
        void showToast({
          style: Toast.Style.Failure,
          title: `${model.name} does not support language selection`,
        });
        void closeMainWindow(); // closeMainWindow returns Promise<void>; void to avoid floating promise in sync callback
        return; // leave isLoading=true so no empty view renders before close
      }

      setLanguages(getLanguagesForModel(model?.supportedLanguages));
      setCurrentCode(settings.selected_language ?? "auto");
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      void showToast({
        style: Toast.Style.Failure,
        title: "Could not load language settings",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(lang: LanguageOption) {
    try {
      writeSettings({ selected_language: lang.code });
      setCurrentCode(lang.code);
      const display =
        lang.code === "auto"
          ? "Auto (detect)"
          : `${lang.native} · ${lang.label}`;
      await showHUD(`Language set to ${display}`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change language",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search languages...">
      {languages.length === 0 && !isLoading ? (
        <List.EmptyView title="No languages available" />
      ) : (
        languages.map((lang) => (
          <List.Item
            key={lang.code}
            title={
              lang.code === "auto"
                ? "Auto (detect)"
                : `${lang.native} · ${lang.label}`
            }
            accessories={
              lang.code === currentCode
                ? [{ text: "Active", icon: Icon.Checkmark }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select Language"
                  icon={Icon.Globe}
                  onAction={() => handleSelect(lang)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
