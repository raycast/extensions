import { Action, ActionPanel, Icon, List, Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { GET_JOT_URL } from "./cli";

const MESSAGE = "This extension needs the Jot app and its CLI.";

/** Shown in place of a view when the jot CLI is not found. */
export function GetJotView() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: "extension-icon.png" }}
        title="Get Jot to start jotting"
        description={`${MESSAGE} Install Jot, or set the CLI path in the extension preferences.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get Jot (Free 3-Day Trial)" icon={Icon.Download} url={GET_JOT_URL} />
            <Action title="Set CLI Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** The same message for no-view commands. */
export async function showGetJotToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Jot is not installed",
    message: MESSAGE,
    primaryAction: { title: "Get Jot", onAction: () => open(GET_JOT_URL) },
  });
}
