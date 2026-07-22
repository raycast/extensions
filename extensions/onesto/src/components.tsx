import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { ApiError, INTEGRATIONS_URL } from "./api";

/** Shared empty view for API errors (bad key, missing scope, network…). */
export function ErrorView({ error }: { error: Error }) {
  const isAuth = error instanceof ApiError && (error.status === 401 || error.status === 403);

  return (
    <List.EmptyView
      icon={isAuth ? Icon.Key : Icon.ExclamationMark}
      title={isAuth ? "Check Your API Key" : "Something Went Wrong"}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser
            title="Open Onesto Integrations"
            icon={Icon.Globe}
            url={INTEGRATIONS_URL}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}
