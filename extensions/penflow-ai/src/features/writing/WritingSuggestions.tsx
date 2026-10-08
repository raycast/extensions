import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Suggestion } from "../../utils/types";

const SUGGESTION_TYPE_TEXT: Record<Suggestion["type"], string> = {
  completion: "Completion",
  translation: "Translation",
  polish: "Polish",
};

interface WritingSuggestionsProps {
  suggestions: Suggestion[];
}

// Type guard function
function isValidSuggestion(suggestion: any): suggestion is Suggestion {
  return (
    suggestion &&
    typeof suggestion.text === "string" &&
    typeof suggestion.type === "string" &&
    ["completion", "translation", "polish"].includes(suggestion.type)
  );
}

export function WritingSuggestions({ suggestions }: WritingSuggestionsProps) {
  // Filter invalid suggestions
  const validSuggestions = suggestions.filter(isValidSuggestion);

  return (
    <List.Section title="Writing Suggestions">
      {validSuggestions.map((suggestion, index) => (
        <List.Item
          key={`${suggestion.type}-${suggestion.text}-${index}`}
          title={suggestion.text}
          icon={Icon.Text}
          accessories={[
            {
              text: SUGGESTION_TYPE_TEXT[suggestion.type] ?? "Suggestion",
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
                <Action.Paste title="Paste to Active App" content={suggestion.text} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
