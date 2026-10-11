import { Action, ActionPanel, Icon, List, showHUD, showToast, Toast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PRESETS, disable, durationLabel, enable, getStatus } from "./lib/session";
import { formatRemaining } from "./lib/parse";

export default function Command() {
  const { data: status, isLoading, revalidate } = usePromise(getStatus);

  async function start(minutes: number | null) {
    try {
      await enable(minutes);
      await showHUD(
        minutes === null
          ? "Lid Awake on until you turn it off"
          : `Lid Awake on for ${durationLabel(minutes).toLowerCase()}`,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not turn on Lid Awake",
        message: error instanceof Error ? error.message : String(error),
      });
    }
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
  }

  const on = status?.on ?? false;
  const session = status?.session ?? null;
  const accessoryTitle = on
    ? session?.endsAt
      ? `On, ${formatRemaining(session.endsAt - Date.now())} left`
      : "On until you turn it off"
    : "Off";

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
      {PRESETS.map((minutes) => {
        const label = durationLabel(minutes);
        const endsAt = minutes === null ? null : new Date(Date.now() + minutes * 60_000);
        return (
          <List.Item
            key={String(minutes)}
            title={label}
            subtitle={
              endsAt
                ? `Until ${endsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                : "Until you turn it off"
            }
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Keep Awake" icon={Icon.Bolt} onAction={() => start(minutes)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
