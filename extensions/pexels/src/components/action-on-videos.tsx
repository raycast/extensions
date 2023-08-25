import { Action, ActionPanel, Icon, open } from "@raycast/api";
import React from "react";
import { ActionToPexels } from "./action-to-pexels";
import { Video } from "pexels";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ActionOnVideos(props: { item: Video }) {
  const { item } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.Video}
        title={"Show Video in Pexels"}
        onAction={async () => {
          await open(item.url);
        }}
      />

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title={"Copy Video Link"}
          content={`${item.url}`}
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
        />
        <Action.CopyToClipboard
          title={"Copy User Link"}
          content={`${item.user.url}`}
          shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title={"Copy User Name"}
          content={`${item.user.name}`}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionToPexels />
      </ActionPanel.Section>

      <ActionOpenPreferences />
    </ActionPanel>
  );
}
