import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { Language } from "@src/types";
import { showErrorToast } from "@src/util";

export const EntriesEmptyView = () => {
  const languageOptions = Object.values(Language);
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
          {languageOptions.map((language) => (
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
