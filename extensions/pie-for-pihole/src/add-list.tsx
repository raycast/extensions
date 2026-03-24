import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";
import { AddListForm } from "./subscription-lists";
import { isV6 } from "./utils";

export default function AddList() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return <AddListForm />;
}
