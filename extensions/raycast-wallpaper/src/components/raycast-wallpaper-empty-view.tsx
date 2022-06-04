import { List } from "@raycast/api";
import React from "react";

export function RaycastWallpaperEmptyView() {
  return <List.EmptyView icon={{ source: "raycast-empty-view-icon.svg" }} title={"No pictures"} />;
}
