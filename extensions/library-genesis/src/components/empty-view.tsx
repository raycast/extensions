import { ActionPanel, List } from "@raycast/api";
import React from "react";

export function EmptyView(props: { title: string }) {
  const { title } = props;

  return (
    <List.EmptyView
      title={title}
      icon={{ source: { light: "empty-view.png", dark: "empty-view@dark.png" } }}
    ></List.EmptyView>
  );
}
