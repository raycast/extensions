import { Action, Detail, environment, Icon } from "@raycast/api";
import React from "react";

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
