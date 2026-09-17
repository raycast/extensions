import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Grid,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useTimer } from "./use-timer";
import { formatTime, phaseLabel, remaining } from "./timer";

const durationChoices = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 120,
];

function durationIcon(minutes: number, color: string, selected: boolean) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="${selected ? color : "#E9EAEC"}"/><circle cx="128" cy="128" r="91" fill="none" stroke="${selected ? "#FFFFFF" : color}" stroke-width="13"/><text x="128" y="140" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="58" font-weight="700" fill="${selected ? "#FFFFFF" : color}">${minutes}</text><text x="128" y="174" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="20" font-weight="600" fill="${selected ? "#FFFFFF" : color}">MIN</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function DurationPicker({ timer }: { timer: ReturnType<typeof useTimer> }) {
  const { pop } = useNavigation();
  const currentMinutes = Math.max(
    1,
    Math.ceil(remaining(timer.state) / 60_000),
  );
  const iconColor =
    timer.state.phase === "focus"
      ? "#D72C35"
      : timer.state.phase === "short-break"
        ? "#2E9B61"
        : "#3478D4";

  return (
    <Grid
      navigationTitle="Set Timer Duration"
      searchBarPlaceholder="Choose a duration…"
      columns={5}
      fit={Grid.Fit.Fill}
    >
      <Grid.Section title={`Current · ${currentMinutes} minutes`}>
        {durationChoices.map((minutes) => (
          <Grid.Item
            key={minutes}
            title={`${minutes}`}
            subtitle="minutes"
            content={durationIcon(
              minutes,
              iconColor,
              minutes === currentMinutes,
            )}
            actions={
              <ActionPanel>
                <Action
                  title={`Set Timer to ${minutes} Minutes`}
                  icon={Icon.Clock}
                  onAction={async () => {
                    await timer.setDuration(minutes);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

export default function Command() {
  const timer = useTimer();
  const { state } = timer;
  const time = formatTime(remaining(state));
  const isRunning = state.status === "running";
  const phaseColor =
    state.phase === "focus"
      ? Color.Red
      : state.phase === "short-break"
        ? Color.Green
        : Color.Blue;
  const dots = Array.from(
    { length: Math.max(4, state.cycleSessions + 1) },
    (_, index) => (index < state.cycleSessions ? "●" : "○"),
  ).join("  ");

  const markdown = [
    `# ${time}`,
    ``,
    `### ${phaseLabel(state.phase)}`,
    ``,
    `> ${isRunning ? "Stay with it. This time is yours." : state.status === "paused" ? "Paused — your place is saved." : "Ready when you are."}`,
    ``,
    `---`,
    ``,
    `### ${dots}`,
    `**${state.focusSessions}** focus session${state.focusSessions === 1 ? "" : "s"} completed today`,
  ].join("\n");

  return (
    <Detail
      isLoading={!timer.loaded}
      navigationTitle="Pomodoro Flow"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Mode"
            text={{ value: phaseLabel(state.phase), color: phaseColor }}
          />
          <Detail.Metadata.Label
            title="Status"
            text={state.status === "running" ? "In progress" : state.status}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Today"
            text={`${state.focusSessions} completed`}
            icon={Icon.CheckCircle}
          />
          <Detail.Metadata.Label
            title="Current cycle"
            text={`${state.cycleSessions} completed`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Timer">
            {isRunning ? (
              <Action
                title="Pause"
                icon={Icon.Pause}
                onAction={timer.pause}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            ) : (
              <Action
                title={state.status === "paused" ? "Resume" : "Start"}
                icon={Icon.Play}
                onAction={timer.start}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            )}
            <Action.Push
              title="Set Duration…"
              icon={Icon.Clock}
              target={<DurationPicker timer={timer} />}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
            <Action
              title="Reset Session"
              icon={Icon.RotateAntiClockwise}
              onAction={timer.reset}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            <Action
              title="Add 5 Minutes"
              icon={Icon.Plus}
              onAction={() => timer.adjust(5)}
              shortcut={{ modifiers: ["cmd"], key: "+" }}
            />
            <Action
              title="Remove 5 Minutes"
              icon={Icon.Minus}
              onAction={() => timer.adjust(-5)}
              shortcut={{ modifiers: ["cmd"], key: "-" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Switch Mode">
            <Action
              title="Focus"
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
              onAction={() => timer.selectPhase("focus")}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title="Short Break"
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
              onAction={() => timer.selectPhase("short-break")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action
              title="Long Break"
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              onAction={() => timer.selectPhase("long-break")}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Statistics"
              icon={Icon.BarChart}
              onAction={() =>
                launchCommand({ name: "stats", type: LaunchType.UserInitiated })
              }
            />
            <Action
              title="Timer Settings"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
