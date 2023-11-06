import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useCachedPromise } from "@raycast/utils";
import { getServersList, getServerCommand } from "./utils";

async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();
  const terminal = prefs.terminal.name;
  try {
    const command = getServerCommand(name, prefs.username);

    await runAppleScript(`
            tell application "Finder" to activate
            tell application "${terminal}" to activate
            tell application "System Events" to tell process "${terminal}" to keystroke "t" using command down
            tell application "System Events" to tell process "${terminal}"
                delay 0.5
                keystroke "${command}"
                delay 0.5
                key code 36
            end tell  
        `);

    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(getServersList);

  return (
    <List isLoading={isLoading}>
      {data?.map((item: { spec: { hostname: string } }, index: number) => {
        const hostname = item.spec.hostname;

        return (
          <List.Item
            key={hostname + index}
            title={hostname}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => open(hostname)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
