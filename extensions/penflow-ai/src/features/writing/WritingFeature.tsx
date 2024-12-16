import { List } from "@raycast/api";
import { EmptyStateView } from "../../components/EmptyStateView";
import { UpgradePrompt } from "../../components/UpgradePrompt";
import { useWritingLogic } from "../../hooks/useWritingLogic";
import { WritingSuggestions } from "./WritingSuggestions";

export function WritingFeature() {
  const { input, setInput, suggestions, isLoading, hasAIPro } =
    useWritingLogic();

  return (
    <List
      isLoading={isLoading && hasAIPro === true}
      searchBarPlaceholder="Type English or Chinese text to get suggestions..."
      onSearchTextChange={setInput}
      throttle
      searchText={input}
    >
      {suggestions.length === 0 && input.trim() === "" ? (
        <EmptyStateView hasAIPro={hasAIPro} />
      ) : (
        <WritingSuggestions suggestions={suggestions} />
      )}
      {hasAIPro === false && <UpgradePrompt />}
    </List>
  );
}
