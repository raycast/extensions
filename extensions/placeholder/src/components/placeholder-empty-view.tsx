import { List } from "@raycast/api";
import React from "react";

export function PlaceholderEmptyView() {
  return <List.EmptyView icon={{ source: "picsum-icon.svg" }} title={"No pictures"} />;
}
