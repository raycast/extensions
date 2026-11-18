import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { InboxError } from "../lib/api";
import { GRAPHITE_CLI_AUTH_URL, GRAPHITE_CLI_INSTALL_URL, inboxErrorTitles } from "../lib/presentation";

const preferencesAction = (
  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
);

/** Empty view explaining why the inbox could not load and how to fix it. */
export function InboxErrorView(props: { error: Error; onRetry: () => void }) {
  const kind = props.error instanceof InboxError ? props.error.kind : "UNEXPECTED";
  const needsAuth = kind === "NOT_SET_UP" || kind === "SIGNED_OUT";
  return (
    <List.EmptyView
      icon={kind === "OFFLINE" ? Icon.WifiDisabled : needsAuth ? Icon.Key : Icon.Warning}
      title={inboxErrorTitles[kind]}
      description={props.error.message}
      actions={
        <ActionPanel>
          {kind === "NOT_SET_UP" ? (
            <Action.OpenInBrowser title="Install the Graphite CLI" url={GRAPHITE_CLI_INSTALL_URL} />
          ) : null}
          {needsAuth ? <Action.OpenInBrowser title="Get a CLI Auth Token" url={GRAPHITE_CLI_AUTH_URL} /> : null}
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
          {preferencesAction}
        </ActionPanel>
      }
    />
  );
}
