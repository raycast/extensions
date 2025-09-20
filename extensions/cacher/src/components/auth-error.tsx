import { Action, ActionPanel, Detail, openExtensionPreferences, open } from "@raycast/api";
import { useCallback } from "react";
import { CREDENTIALS_URL } from "../lib/constants/urls";

export default function AuthError() {
  const message = `# Failed to authenticate with Cacher.
  1. [Click here](${CREDENTIALS_URL}) to view your Cacher API credentials.
  2. Press **Enter** to open Raycast extension preferences.
  3. Fill in the **API Key** and **API Token** fields from **Step 1**.`;

  const openCredentials = useCallback(() => {
    open(CREDENTIALS_URL);
  }, []);

  return (
    <Detail
      navigationTitle="Failed to authenticate with Cacher"
      markdown={message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action title="View Cacher Credentials" onAction={openCredentials} />
        </ActionPanel>
      }
    />
  );
}
