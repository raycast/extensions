import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PRESETS, disable, durationLabel, enable, getStatus } from "./lib/session";
import { presetSubtitle, startAccessoryTitle, turnOnMessage } from "./lib/labels";

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getStatus);

  async function start(minutes: number | null) {
    try {
      await enable(minutes);
      await showHUD(turnOnMessage(minutes));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not turn on Lid Awake",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    revalidate();
  }

  async function turnOff() {
    try {
      await disable();
      await showHUD("Lid Awake off");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not turn off Lid Awake",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    revalidate();
  }

  const on = status?.on ?? false;
  const now = Date.now();
  const accessoryTitle = startAccessoryTitle(status, now);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Keep awake for how long?">
      {on && (
        <List.Item
          title="Turn Off"
          icon={{ source: Icon.Power, tintColor: Color.Red }}
          accessories={[{ text: accessoryTitle }]}
          actions={
            <ActionPanel>
              <Action title="Turn off Lid Awake" icon={Icon.Power} onAction={turnOff} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {PRESETS.map((minutes) => (
        <List.Item
          key={String(minutes)}
          title={durationLabel(minutes)}
          subtitle={presetSubtitle(minutes, now)}
          icon={Icon.Clock}
          actions={
            <ActionPanel>
              <Action title="Keep Awake" icon={Icon.Bolt} onAction={() => start(minutes)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
