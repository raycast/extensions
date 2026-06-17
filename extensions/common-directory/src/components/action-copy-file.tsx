import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import React from "react";

export function ActionCopyFile(props: { name: string; path: string }) {
  const { name, path } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Clipboard}
        title={"Copy File"}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          await showHUD(`${name} is copied to clipboard`);
          await Clipboard.copy({ file: path });
        }}
      />
      <Action.CopyToClipboard title={"Copy Name"} content={name} shortcut={{ modifiers: ["shift", "cmd"], key: "." }} />
      <Action.CopyToClipboard title={"Copy Path"} content={path} shortcut={{ modifiers: ["shift", "cmd"], key: "," }} />
    </ActionPanel.Section>
  );
}
