import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Suggestion } from "../../utils/types";

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
  console.log("WritingSuggestions - received suggestions:", JSON.stringify(suggestions, null, 2));

  // Filter invalid suggestions
  const validSuggestions = suggestions.filter(isValidSuggestion);
  console.log("WritingSuggestions - valid suggestions:", JSON.stringify(validSuggestions, null, 2));

  return (
    <List.Section title="Writing Suggestions">
      {validSuggestions.map((suggestion, index) => {
        console.log(`Rendering suggestion ${index}:`, JSON.stringify(suggestion, null, 2));
        return (
          <List.Item
            key={index}
            title={suggestion.text}
            icon={Icon.Text}
            accessories={[
              {
                text:
                  suggestion.type === "completion"
                    ? "Completion"
                    : suggestion.type === "translation"
                      ? "Translation"
                      : "Polish",
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
        );
      })}
    </List.Section>
  );
}
