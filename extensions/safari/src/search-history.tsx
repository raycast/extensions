import { List, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { useState } from "react";
import { FallbackSearchSection, HistoryListSection, PermissionError } from "./components";
import { useHistorySearch } from "./hooks";
import { groupHistoryByDay, isPermissionError } from "./utils";

const Command = () => {
  const [searchText, setSearchText] = useState<string>();
  const { results, error, isLoading } = useHistorySearch(searchText);

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionError />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search history",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const groupedHistoryEntries = _.chain(results).reduce(groupHistoryByDay, new Map()).value();

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText}>
      {groupedHistoryEntries &&
        Array.from(groupedHistoryEntries.entries()).map(([date, entries]) => (
          <HistoryListSection key={date} title={date} entries={entries} searchText={searchText} />
        ))}
      <FallbackSearchSection searchText={searchText} />
    </List>
  );
};

export default Command;
