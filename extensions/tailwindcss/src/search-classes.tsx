import { useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import classes from "./classes.json";

export default function SearchClasses() {
  const [query, setQuery] = useState("");
  const results = (classes as Array<{ selector: string; classes: string }>)
    .filter((c) => c.selector.includes(query))
    .slice(0, 100);
  return (
    <List searchText={query} onSearchTextChange={setQuery} searchBarPlaceholder="Search all classes...">
      {results.map(({ selector, classes }) => (
        <List.Item
          title={selector}
          key={selector}
          accessories={[{ text: classes }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Selector"
                content={selector}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action.CopyToClipboard title="Copy CSS" content={classes} shortcut={{ modifiers: ["cmd"], key: "," }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
