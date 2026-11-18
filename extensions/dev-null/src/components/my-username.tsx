import type { ReactNode } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { parseUsername } from "../lib/api";
import { USERNAME_KEY } from "../username";

/**
 * Renders its children with the user's own username: the one in the preferences, or else the one from their last
 * commit. Without either, it says how to set one.
 */
export function WithMyUsername({ children }: { children: (username: string) => ReactNode }) {
  const preferred = parseUsername(getPreferenceValues<Preferences>().username ?? "");
  const { value: remembered, isLoading } = useLocalStorage<string>(USERNAME_KEY);
  const username = preferred ?? remembered;

  if (username) return children(username);
  return (
    <List isLoading={isLoading}>
      {!isLoading && (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="Which account is yours?"
          description="Add your /dev/null username in the extension's preferences. Posting a commit also sets it."
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
