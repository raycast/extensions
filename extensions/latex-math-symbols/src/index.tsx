import { useEffect, useState } from "react";
import CommandList from "./commands";
import { ActionPanel, Action, List } from "@raycast/api";
import Fuse from "fuse.js";

const ITEMS = CommandList.map((value, index) => {
  return {
    id: index,
    title: value.command,
    example: value.example,
    subtitle: value.descriptions.join("; "),
  };
});

const FuseOptions = {
  includeScore: false,
  keys: ["title", "subtitle"],
  minMatchCharLength: 1,
};
const fuse = new Fuse(ITEMS, FuseOptions);

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [filteredList, filterList] = useState(ITEMS);

  useEffect(() => {
    if (searchText.length > 0) {
      const results = fuse.search(searchText);
      filterList(results.map((result) => result.item));
    } else {
      filterList(ITEMS);
    }
  }, [searchText]);

  return (
    <List filtering={false} onSearchTextChange={setSearchText} searchBarPlaceholder="Search LateX Math Symbols">
      {filteredList.map((result) => {
        return (
          <List.Item
            key={result.id}
            title={result.title}
            subtitle={result.subtitle}
            accessories={[{ text: result.example }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.title} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
