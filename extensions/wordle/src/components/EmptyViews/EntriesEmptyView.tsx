import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { Language } from "@src/types";
import { showErrorToast } from "@src/util";

type EntriesEmptyViewProps = {
  selectedLanguages: Language[];
};

export const EntriesEmptyView = ({ selectedLanguages }: EntriesEmptyViewProps) => {
  const languageOptions = Object.values(Language);
  const isSingleLanguageSelected = selectedLanguages.length === 1;

  const startPlaying = async (language: Language) => {
    try {
      await launchCommand({ name: `play_${language}`, type: LaunchType.UserInitiated });
    } catch {
      await showErrorToast({ title: "Failed to start playing" });
    }
  };

  return (
    <List.EmptyView
      title={`It is pretty empty around here`}
      description={`Start playing or change the filter settings to see some entries.`}
      icon={{ source: "oops-face.png" }}
      actions={
        <ActionPanel>
          {languageOptions
            .sort((lang) => (selectedLanguages.includes(lang) && isSingleLanguageSelected ? -1 : 1))
            .map((language) => (
              <Action
                key={language}
                icon={Icon.Play}
                title={`Start Playing (${language})`}
                onAction={() => startPlaying(language)}
              />
            ))}
        </ActionPanel>
      }
    />
  );
};
