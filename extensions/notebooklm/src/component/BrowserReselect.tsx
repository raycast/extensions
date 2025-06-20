import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";
import { BrowserList } from "../types";

export const BrowserReselect = () => {
  return (
    <Detail
      markdown={`## ⚠️ Browser Selection Required

Please choose one of the supported browsers below before proceeding:

${Object.entries(BrowserList)
  .map(([key, value]) => `- [${key}](${value})`)
  .join("\n")}`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};
