import { Action, ActionPanel, List, Icon, useNavigation } from "@raycast/api";
import { useSettingsStore } from "../../hooks/store/settings/useSettings";
import { useSupportedLanguages } from "../../hooks/useTypingData";

export function LanguageSelector() {
  const { pop } = useNavigation();

  const { language, setLanguage } = useSettingsStore();

  const { languages, isLoading } = useSupportedLanguages();
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search languages...">
      {languages.map((lang) => (
        <List.Item
          key={lang}
          title={lang}
          icon={lang === language ? Icon.CheckCircle : Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Select Language"
                onAction={() => {
                  setLanguage(lang);
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
