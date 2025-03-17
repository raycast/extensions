import { List, ActionPanel, Action, Icon } from "@raycast/api";

interface SuggestionListProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  onPolish: (suggestion: string) => void;
  isLoading?: boolean;
}

export function SuggestionList({ suggestions, onSelect, onPolish, isLoading = false }: SuggestionListProps) {
  return (
    <List isLoading={isLoading}>
      {suggestions.map((suggestion, index) => (
        <List.Item
          key={index}
          title={suggestion}
          icon={Icon.Text}
          actions={
            <ActionPanel>
              <Action title="Use Suggestion" icon={Icon.CheckCircle} onAction={() => onSelect(suggestion)} />
              <Action title="Polish Text" icon={Icon.Wand} onAction={() => onPolish(suggestion)} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={suggestion} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
