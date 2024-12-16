import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Suggestion } from "../../utils/types";

interface WritingSuggestionsProps {
  suggestions: Suggestion[];
}

export function WritingSuggestions({ suggestions }: WritingSuggestionsProps) {
  return (
    <List.Section title="Writing Suggestions">
      {suggestions.map((suggestion, index) => (
        <List.Item
          key={index}
          title={suggestion.text}
          icon={Icon.Text}
          accessories={[
            {
              text:
                suggestion.type === "completion" ? "Completion" : "Translation",
              tooltip: "Suggestion type",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  content={suggestion.text}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste to Active App"
                  content={suggestion.text}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
