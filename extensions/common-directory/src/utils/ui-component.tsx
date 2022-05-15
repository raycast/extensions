import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { copyFileByPath, isEmpty } from "./common-utils";
import React from "react";
import { DirectoryInfo } from "./directory-info";

export function CopyFileActions(props: { directory: DirectoryInfo }) {
  const { directory } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Clipboard}
        title={"Copy File"}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          const copyResult = await copyFileByPath(directory.path);
          if (isEmpty(copyResult)) {
            await showHUD(`${directory.name} is copied to clipboard`);
          } else {
            await showHUD(copyResult);
          }
        }}
      />
      <Action.CopyToClipboard
        title={"Copy Name"}
        content={directory.name}
        shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
      />
      <Action.CopyToClipboard
        title={"Copy Path"}
        content={directory.path}
        shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
      />
    </ActionPanel.Section>
  );
}
