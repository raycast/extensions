import { List } from "@raycast/api";

import { useCachedState } from "@raycast/utils";
import SearchHistoryItem from "./components/SearchHistoryItem";

export default function Command() {
  const [history] = useCachedState("history", []);

  return (
    <List searchBarPlaceholder="Search...">
      <List.Section title="Search History" subtitle={history.length + ""}>
        {history.map((item, idx) => (
          <SearchHistoryItem key={idx} searchHistoryItem={item} />
        ))}
      </List.Section>
    </List>
  );
}
