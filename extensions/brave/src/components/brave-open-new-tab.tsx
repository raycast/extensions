import { openNewTabWithUrl } from "../utils";
import { ActionPanel, Icon } from "@raycast/api";
import React from "react";

export default function BraveOpenNewTab(props: { title: string; url: string }) {
  async function handleAction() {
    await openNewTabWithUrl(props.url);
  }

  return <ActionPanel.Item title="Open in Brave" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
