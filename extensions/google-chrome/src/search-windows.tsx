import { List } from "@raycast/api";
import { useState } from "react";
import { ChromeListItems } from "./components";
import { useWindowSearch } from "./hooks/useWindowSearch";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, errorView, isLoading, mutate } = useWindowSearch(searchText);

  return (
    errorView ?? (
      <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search chrome windows">
        {data.map((win) => (
          <ChromeListItems.WindowList key={win.id} window={win} refreshWindowsListOnFailure={() => mutate()} />
        ))}
      </List>
    )
  );
}
