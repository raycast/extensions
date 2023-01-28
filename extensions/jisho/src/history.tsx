import { List } from "@raycast/api";

import { useCachedState } from "@raycast/utils";
import SearchHistoryItem from "./components/SearchHistoryItem";
import { useSearchHistory } from "./hooks/useSearchHistory";

export default function Command() {
  const { history, addToHistory } = useSearchHistory("");

  return (
    <List searchBarPlaceholder="Search...">
      <List.Section title="Search History" subtitle={history.length + ""}>
        {history.map((item, idx) => (
          <SearchHistoryItem key={idx} searchHistoryItem={item} addToHistory={addToHistory} />
        ))}
      </List.Section>
    </List>
  );
}
