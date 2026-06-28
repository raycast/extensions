import { Action, ActionPanel, Detail, Icon, LaunchType, List, launchCommand } from "@raycast/api";

const LoginAction = () => (
  <Action
    title="Log in to Deserveos"
    icon={Icon.Key}
    onAction={() => launchCommand({ name: "login", type: LaunchType.UserInitiated })}
  />
);

const MESSAGE = [
  "# Not logged in",
  "",
  "You need to sign in to your DeserveOS workspace before using this command.",
  "",
  "Run **Log in to DeserveOS** (press ↵ below), then come back.",
].join("\n");

export function LoginPromptDetail() {
  return (
    <Detail
      markdown={MESSAGE}
      actions={
        <ActionPanel>
          <LoginAction />
        </ActionPanel>
      }
    />
  );
}

export function LoginPromptList() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="Not logged in"
        description="Log in to your DeserveOS workspace to continue."
        actions={
          <ActionPanel>
            <LoginAction />
          </ActionPanel>
        }
      />
    </List>
  );
}
