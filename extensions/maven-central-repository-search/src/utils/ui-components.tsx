import { Action, Detail, environment, Icon } from "@raycast/api";
import React from "react";

export function ActionToPexels(props: { url: string }) {
  const { url } = props;
  return (
    <Action.OpenInBrowser
      title={"Go Maven Central Repository Search"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
      url={url}
    />
  );
}

export function ActionToAdvancedSearchOptions() {
  const icon = `advanced-search-options${environment.theme == "dark" ? "@dark" : ""}.png`;
  return (
    <Action.Push
      icon={Icon.MemoryChip}
      title={"Advanced Search Options"}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
      target={<Detail markdown={`<img src="file://${environment.assetsPath}/${icon}" alt="" height="400" />`} />}
    />
  );
}
