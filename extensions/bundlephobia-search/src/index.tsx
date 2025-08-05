import { List } from "@raycast/api";
import * as React from "react";
import { usePackages, useToastError } from "./hooks";
import { ListItem } from "./components/list-item";

export default function Command() {
  const [query, setQuery] = React.useState<string>("");
  const { state, items } = usePackages(query);
  useToastError(state, "Failed to load packages");

  return (
    <List
      isLoading={state.status === "loading"}
      searchBarPlaceholder="Type to search package..."
      onSearchTextChange={(text) => setQuery(text)}
      throttle
    >
      {items.map((result) => (
        <ListItem data={result} key={result.name} />
      ))}
    </List>
  );
}
