// src/projects/components/SearchSuggestionsList.tsx
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import type { SearchSuggestion } from "../types";

interface SearchSuggestionsListProps {
  suggestions: SearchSuggestion[];
  onApply: (filter: string) => void;
}

export function SearchSuggestionsList({
  suggestions,
  onApply,
}: SearchSuggestionsListProps) {
  return (
    <List.Section title="Suggestions" subtitle="Tab or Enter to apply">
      {suggestions.map((suggestion) => (
        <List.Item
          key={suggestion.id}
          title={suggestion.title}
          subtitle={suggestion.subtitle}
          icon={{ source: suggestion.icon, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action
                title="Apply Filter"
                icon={Icon.Filter}
                onAction={() => onApply(suggestion.filter)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
