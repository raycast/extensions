import { Action } from "@raycast/api";
import React from "react";

export function ActionToPexels(props: { url: string }) {
  const { url } = props;
  return (
    <Action.OpenInBrowser
      title={"Go Maven Central Repository"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "m" }}
      url={url}
    />
  );
}
