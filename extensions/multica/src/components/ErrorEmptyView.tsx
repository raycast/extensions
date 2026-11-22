import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { MulticaApiError } from "../lib/api";
import { MissingCredentialsError } from "../lib/config";

/** Explains a failure to load workspaces, which usually means auth is missing or stale. */
export function ErrorEmptyView({ error }: { error: Error }) {
  const isAuth = error instanceof MissingCredentialsError || (error instanceof MulticaApiError && error.status === 401);

  return (
    <List.EmptyView
      icon={isAuth ? Icon.Lock : Icon.Warning}
      title={isAuth ? "Not signed in to Multica" : "Couldn't reach Multica"}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
