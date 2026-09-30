import { List } from "@raycast/api";

import SearchHistoryItem from "./components/SearchHistoryItem";
import { useSearchHistory } from "./hooks/useSearchHistory";

export default function Command() {
  const { history, addToHistory, removeFromHistory } = useSearchHistory("");

  return (
    <List searchBarPlaceholder="Search History...">
      <List.Section title="Search History" subtitle={history.length + ""}>
        {history.map((item, idx) => (
          <SearchHistoryItem
            key={idx}
            searchHistoryItem={item}
            removeFromHistory={removeFromHistory}
            addToHistory={addToHistory}
          />
        ))}
      </List.Section>
    </List>
  );
}
