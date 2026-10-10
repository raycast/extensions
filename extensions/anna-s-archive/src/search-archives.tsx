import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

const Command = () => {
  return (
    <Detail
      markdown={`
# This extension is broken.

> **Note from the author:** Per October 8th, 2026, this extension is obsolete.

Unfortunately, due to Anna's Archive implementing bot protection, without having any API that could be used, this extension is no longer able to be used. You can uninstall the extension, it will be removed from the store in the near future.
    `}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};

export default Command;
