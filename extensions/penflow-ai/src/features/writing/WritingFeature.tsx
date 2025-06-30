import { List } from "@raycast/api";
import { EmptyStateView } from "../../components/EmptyStateView";
import { useWritingLogic } from "../../hooks/useWritingLogic";
import { WritingSuggestions } from "./WritingSuggestions";

export function WritingFeature() {
  const { input, setInput, suggestions, isLoading } = useWritingLogic();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type English or Chinese text to get suggestions..."
      onSearchTextChange={setInput}
      throttle
      searchText={input}
    >
      {suggestions.length === 0 && input.trim() === "" ? (
        <EmptyStateView />
      ) : (
        <WritingSuggestions suggestions={suggestions} />
      )}
    </List>
  );
}
