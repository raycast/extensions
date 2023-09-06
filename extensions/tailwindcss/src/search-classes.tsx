import { useState } from "react";
import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import classes from "./classes.json";

const preferences = getPreferenceValues();

function formatClasses(css: string): string {
  if (preferences.measuringUnit === "px") {
    return css.replace(/(\d+\.?\d*)r?em/g, (_, rem) => `${Math.floor(parseFloat(rem) * 16)}px`);
  } else {
    return css;
  }
}

export default function SearchClasses() {
  const [query, setQuery] = useState("");
  const results = (classes as Array<{ selector: string; classes: string }>)
    .filter((c) => c.selector.includes(query) || c.classes.includes(query))
    .slice(0, 100);

  return (
    <List searchText={query} onSearchTextChange={setQuery} searchBarPlaceholder="Search all classes...">
      {results.map(({ selector, classes }) => (
        <List.Item
          key={selector}
          title={selector}
          accessories={[{ text: formatClasses(classes) }]}
          actions={<ClassesAction selector={selector} classes={formatClasses(classes)} />}
        />
      ))}
    </List>
  );
}

function ClassesAction({ selector, classes }: { selector: string; classes: string }) {
  switch (preferences.defaultAction) {
    case "selector":
      return (
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Selector" content={selector} />
          <Action.CopyToClipboard title="Copy CSS" content={classes} />
          <Action.CopyToClipboard
            title="Copy Class Name"
            content={selector.replace(".", "")}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      );
    case "css":
      return (
        <ActionPanel>
          <Action.CopyToClipboard title="Copy CSS" content={classes} />
          <Action.CopyToClipboard title="Copy Selector" content={selector} />
          <Action.CopyToClipboard
            title="Copy Class Name"
            content={selector.replace(".", "")}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      );
    case "class":
      return (
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Class Name" content={selector.replace(".", "")} />
          <Action.CopyToClipboard title="Copy Selector" content={selector} />
          <Action.CopyToClipboard title="Copy CSS" content={classes} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      );
  }
  return null;
}
