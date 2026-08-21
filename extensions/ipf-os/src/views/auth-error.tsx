import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";

import { getAuthProvider } from "../lib/auth";

export function AuthErrorView({ error }: { error: Error }) {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Key, tintColor: Color.Red }}
        title="Connect to iPF OS"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Connect to iPF OS" icon={Icon.Link} onAction={() => void getAuthProvider().getSession()} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action title="Sign out" icon={Icon.Trash} onAction={() => void getAuthProvider().signOut()} />
          </ActionPanel>
        }
      />
    </List>
  );
}
