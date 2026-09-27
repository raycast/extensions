import { Action, ActionPanel, Icon } from "@raycast/api";
import { useTasks } from "../task-state";
import { BROWSER_SETTINGS_URL } from "../vendor/browser-settings";

export function CommonActions() {
  const { refresh, signOut, busy } = useTasks();
  return (
    <ActionPanel.Section>
      <Action
        title="Refresh Tasks"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => refresh()}
      />
      <Action.OpenInBrowser title="Open Happy Squid Settings" icon={Icon.Gear} url={BROWSER_SETTINGS_URL} />
      {!busy && <Action title="Sign Out" icon={Icon.Logout} onAction={signOut} />}
    </ActionPanel.Section>
  );
}
