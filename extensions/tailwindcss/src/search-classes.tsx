import { Action, ActionPanel, List } from "@raycast/api";
import output from "../generator/output.json";
import { useState } from "react";

const classes = Object.entries(output).map(([selector, classes]) => ({
  selector,
  classes,
}));

export default function SearchClasses() {
  const [query, setQuery] = useState("");
  const results = classes.filter((c) => c.selector.includes(query)).slice(0, 100);
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
