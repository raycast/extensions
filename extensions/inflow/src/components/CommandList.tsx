import { Action, ActionPanel, Application, Icon, List } from "@raycast/api";
import type { TextCommandConfig } from "../core/command";
import { InputSource } from "../core/input";
import { HistoryItem } from "../core/storage";
import { getCommandIcon } from "../commandManifest";

type CommandListProps = {
  history: HistoryItem[];
  inputApp?: Application;
  inputSource: InputSource;
  inputText: string;
  isLoading: boolean;
  onClearHistory: () => void;
  onCopyPrompt: (prompt: string) => void;
  onDeleteHistory: (prompt: string) => void;
  onRun: (prompt: string, title?: string) => void;
  onSearchTextChange: (text: string) => void;
  onToggleFavorite: (prompt: string) => void;
  presets: TextCommandConfig[];
  searchText: string;
};

export function CommandList({
  history,
  inputApp,
  inputSource,
  inputText,
  isLoading,
  onClearHistory,
  onCopyPrompt,
  onDeleteHistory,
  onRun,
  onSearchTextChange,
  onToggleFavorite,
  presets,
  searchText,
}: CommandListProps) {
  const getNavigationTitle = () => {
    if (!inputApp) return undefined;

    if (inputText && inputSource === "selected") {
      const singleLineText = inputText.replace(/\s+/g, " ").trim();
      const truncated = singleLineText.length > 50 ? `${singleLineText.substring(0, 50)}…` : singleLineText;
      return `[${inputApp.name}] ${truncated}`;
    }

    return `[${inputApp.name}]`;
  };

  const filterFn = (text: string) => !searchText || text.toLowerCase().includes(searchText.toLowerCase());

  const filteredFavorites = history.filter((item) => item.isFavorite && filterFn(item.prompt));
  const filteredPresets = presets.filter((cmd) => filterFn(cmd.title) || filterFn(cmd.description || ""));
  const filteredHistory = history.filter((item) => !item.isFavorite && filterFn(item.prompt));
  const hasVisibleItems =
    Boolean(searchText) || filteredFavorites.length > 0 || filteredPresets.length > 0 || filteredHistory.length > 0;

  return (
    <List
      navigationTitle={getNavigationTitle()}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder="Type an AI instruction to process selected text…"
      isLoading={isLoading}
      filtering={false}
    >
      {isLoading && !hasVisibleItems && (
        <List.Section title="Loading">
          <List.Item title="Loading commands..." icon={Icon.Clock} />
        </List.Section>
      )}

      {searchText && (
        <List.Section title="Custom">
          <List.Item
            title={searchText}
            subtitle="Run custom instructions on selected text"
            icon={{ source: "command/custom.png" }}
            actions={
              <ActionPanel>
                <Action title="Run Custom Prompt" icon={Icon.Bolt} onAction={() => onRun(searchText)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {filteredFavorites.length > 0 && (
        <List.Section title="Favorites">
          {filteredFavorites.map((item) => (
            <List.Item
              key={`fav-${item.prompt}`}
              title={item.prompt}
              icon={{ source: "command/star.png" }}
              actions={
                <ActionPanel>
                  <Action title="Run" icon={Icon.Bolt} onAction={() => onRun(item.prompt)} />
                  <Action
                    title="Unfavorite"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => onToggleFavorite(item.prompt)}
                  />
                  <Action
                    title="Copy Prompt"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => onCopyPrompt(item.prompt)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => onDeleteHistory(item.prompt)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredPresets.length > 0 && (
        <List.Section title="Presets">
          {filteredPresets.map((cmd) => (
            <List.Item
              key={cmd.name || cmd.title}
              title={cmd.title}
              icon={getCommandIcon(cmd.icon)}
              subtitle={cmd.description}
              actions={
                <ActionPanel>
                  <Action title="Run" icon={Icon.Bolt} onAction={() => onRun(cmd.prompt, cmd.title)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredHistory.length > 0 && (
        <List.Section title="History">
          {filteredHistory.map((item) => (
            <List.Item
              key={item.prompt}
              title={item.prompt}
              icon={{ source: "command/history.png" }}
              accessories={item.isFavorite ? [{ icon: Icon.Star, tooltip: "Favorited" }] : []}
              actions={
                <ActionPanel>
                  <Action title="Run" icon={Icon.Bolt} onAction={() => onRun(item.prompt)} />
                  <Action
                    title={item.isFavorite ? "Unfavorite" : "Favorite"}
                    icon={item.isFavorite ? Icon.StarDisabled : Icon.Star}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => onToggleFavorite(item.prompt)}
                  />
                  <Action
                    title="Copy Prompt"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => onCopyPrompt(item.prompt)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => onDeleteHistory(item.prompt)}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    onAction={onClearHistory}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
