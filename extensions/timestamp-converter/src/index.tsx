import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { convertTimestamp } from "./utils/converter";

interface Preferences {
  timezone: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");

  const targetTimezone =
    preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const results = useMemo(() => {
    return convertTimestamp(searchText, targetTimezone);
  }, [searchText, targetTimezone]);

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a timestamp or date..."
      throttle
    >
      {results.length > 0 ? (
        results.map((item, index) => (
          <List.Item
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            accessories={[{ text: targetTimezone }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.value} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="Invalid Date" icon={Icon.XMarkCircle} />
      )}
    </List>
  );
}
