import { Action, ActionPanel, Icon, launchCommand, LaunchType, List } from "@raycast/api";

/** Shown instead of any Drive content once the CLI reports that no session is active. */
export function SignedOutView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="Not signed in to Proton Drive"
        description="The Proton Drive CLI has no active session, so nothing from your Drive is shown. Log in to browse it again."
        actions={
          <ActionPanel>
            <Action
              title="Log in"
              icon={Icon.Key}
              onAction={() => launchCommand({ name: "login", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
