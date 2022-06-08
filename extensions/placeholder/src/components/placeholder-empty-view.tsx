import { List } from "@raycast/api";
import React from "react";

export function PlaceholderEmptyView() {
  return (
    <List.EmptyView icon={{ source: { light: "picsum-icon.svg", dark: "picsum-icon@dark.svg" } }} title={"No images"} />
  );
}
