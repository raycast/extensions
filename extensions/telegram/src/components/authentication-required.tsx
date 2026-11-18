import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { launchAuthentication } from "../utils/auth";

export function AuthenticationRequired({ form = false }: { form?: boolean }) {
  const actions = (
    <ActionPanel>
      <Action title="Authenticate with Telegram" icon={Icon.Key} onAction={launchAuthentication} />
    </ActionPanel>
  );

  if (form) {
    return (
      <Detail
        markdown="# Sign In to Telegram\n\nYour Telegram session is no longer valid. Sign in again to continue."
        actions={actions}
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.Key}
      title="Sign In to Telegram"
      description="Your Telegram session is no longer valid. Sign in again to continue."
      actions={actions}
    />
  );
}
