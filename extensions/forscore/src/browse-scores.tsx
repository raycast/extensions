import { List, Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { useScores } from "./hooks/hooks";
import { openScore } from "./utils/utils";
import { PreferencesAction } from "./components/PreferencesAction";

export default function Command() {
  const { data: scores, isLoading, error } = useScores();

  if (error) {
    const isConfigError = error.message.includes("No CSV file configured");
    return (
      <List searchBarPlaceholder="Search scores...">
        <List.EmptyView
          icon={isConfigError ? Icon.Gear : Icon.XMarkCircle}
          title={isConfigError ? "No CSV File Configured" : "Error Loading Scores"}
          description={error.message}
          actions={
            <ActionPanel>
              <PreferencesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search scores...">
      {!isLoading && (!scores || scores.length === 0) ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Scores Found"
          description="Your CSV file appears to be empty or has no valid entries"
          actions={
            <ActionPanel>
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ) : (
        scores?.map((score, index) => (
          <List.Item
            key={index}
            icon={Icon.Document}
            title={score.title}
            subtitle={score.composers}
            accessories={[
              ...(score.tags ? [{ tag: score.tags, icon: Icon.Tag, tooltip: "Tags" }] : []),
              ...(score.genres ? [{ tag: score.genres, icon: Icon.Music, tooltip: "Genres" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Open in forScore" icon={Icon.Play} onAction={() => openScore(score)} />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={score.title}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <ActionPanel.Section title="Settings">
                  <PreferencesAction />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
