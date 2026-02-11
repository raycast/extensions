import { List } from "@raycast/api";
import { useState, useMemo } from "react";
import { useSearchEntries } from "./utils/useSearchEntries";
import EntryListItem from "./components/EntryListItem";
import FilterDropdown from "./components/FilterDropdown";

export default function SearchEntries() {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const state = useSearchEntries(searchText);

  const filteredEntries = useMemo(() => {
    if (filterValue === "starred") {
      return state.entries?.filter((entry) => entry.starred === true) || [];
    }
    return state.entries?.filter((entry) => filterValue === "all" || entry.status === filterValue) || [];
  }, [filterValue, state.entries]);

  return (
    <>
      <List
        isLoading={state.isLoading}
        onSearchTextChange={setSearchText}
        navigationTitle="Search entries"
        searchBarPlaceholder="Search from your Miniflux feeds"
        searchBarAccessory={<FilterDropdown handleFilter={setFilterValue} filter="status" />}
        throttle
      >
        {filteredEntries.map((entry) => (
          <EntryListItem key={entry.id} entry={entry} />
        ))}
      </List>
    </>
  );
}
