import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { calliday, callidayJSON, clock, fmt, Status } from "./lib/cli";

const STATE_META: Record<
  Status["state"],
  { label: string; icon: Icon; tint: Color }
> = {
  tracking: { label: "Tracking", icon: Icon.CircleFilled, tint: Color.Green },
  idle: {
    label: "Idle — clock stopped",
    icon: Icon.Circle,
    tint: Color.Yellow,
  },
  paused: { label: "Paused", icon: Icon.PauseFilled, tint: Color.Orange },
  stopped: {
    label: "Tracker stopped",
    icon: Icon.ExclamationMark,
    tint: Color.Red,
  },
};

export default function Now() {
  const { data, isLoading, revalidate } = usePromise(() =>
    callidayJSON<Status>(["status"]),
  );

  const openApp = (
    <Action
      title="Open Calliday"
      icon={Icon.AppWindow}
      onAction={() => open("calliday://")}
    />
  );

  return (
    <List isLoading={isLoading}>
      {data && (
        <>
          <List.Section title="Now">
            <List.Item
              icon={{
                source: STATE_META[data.state].icon,
                tintColor: STATE_META[data.state].tint,
              }}
              title={data.current?.app ?? STATE_META[data.state].label}
              subtitle={data.current?.domain ?? data.current?.title}
              accessories={
                data.current
                  ? [
                      {
                        text: fmt(
                          Math.max(0, Date.now() / 1000 - data.current.since),
                        ),
                        icon: Icon.Clock,
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  {openApp}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Calendar}
              title="Today"
              accessories={[{ text: `${fmt(data.today_seconds)} tracked` }]}
              actions={<ActionPanel>{openApp}</ActionPanel>}
            />
          </List.Section>
          <List.Section title="Timer">
            {data.timer ? (
              <List.Item
                icon={{ source: Icon.Stopwatch, tintColor: Color.Orange }}
                title={data.timer.name}
                subtitle={
                  data.timer.project ? `[${data.timer.project}]` : undefined
                }
                accessories={[{ text: `since ${clock(data.timer.start)}` }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Stop Timer"
                      icon={Icon.Stop}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await calliday(["timer", "stop"]);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Timer stopped",
                        });
                        revalidate();
                      }}
                    />
                    {openApp}
                  </ActionPanel>
                }
              />
            ) : (
              <List.Item
                icon={Icon.Stopwatch}
                title="No timer running"
                subtitle="Use “Start Timer” to begin one"
                actions={<ActionPanel>{openApp}</ActionPanel>}
              />
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
