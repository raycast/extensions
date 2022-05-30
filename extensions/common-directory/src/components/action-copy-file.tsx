import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import React from "react";
import { isEmpty } from "../utils/common-utils";
import { copyFileByPath } from "../utils/applescript-utils";

export function ActionCopyFile(props: { name: string; path: string }) {
  const { name, path } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Clipboard}
        title={"Copy File"}
        shortcut={{ modifiers: ["cmd"], key: "." }}
        onAction={async () => {
          const copyResult = await copyFileByPath(path);
          if (isEmpty(copyResult)) {
            await showHUD(`${name} is copied to clipboard`);
          } else {
            await showHUD(copyResult);
          }
        }}
      />
      <Action.CopyToClipboard title={"Copy Name"} content={name} shortcut={{ modifiers: ["shift", "cmd"], key: "." }} />
      <Action.CopyToClipboard title={"Copy Path"} content={path} shortcut={{ modifiers: ["shift", "cmd"], key: "," }} />
    </ActionPanel.Section>
  );
}
