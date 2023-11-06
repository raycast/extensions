import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { appleScriptTerminalCommand, connectToServerCommand, serversList } from "./utils";
import { useMemo } from "react";

async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  const prefs = getPreferenceValues();

  try {
    await runAppleScript(appleScriptTerminalCommand(prefs.terminal.name, connectToServerCommand(name, prefs.username)));
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

export default function Command() {
  const { data, isLoading } = serversList();
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item: { spec: { hostname: string } }, index: number) => {
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
