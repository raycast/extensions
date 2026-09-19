import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { useTimer } from "./use-timer";
import { formatTime, phaseLabel, remaining } from "./timer";

export default function MenuBarCommand() {
  const timer = useTimer();
  const { state } = timer;
  const left = remaining(state);
  const running = state.status === "running";
  const tintColor =
    state.phase === "focus"
      ? Color.Red
      : state.phase === "short-break"
        ? Color.Green
        : Color.Blue;
  const title = running
    ? formatTime(left)
    : state.status === "paused"
      ? `Ⅱ ${formatTime(left)}`
      : formatTime(left);

  return (
    <MenuBarExtra
      isLoading={!timer.loaded}
      icon={{
        source: running ? Icon.CircleProgress100 : Icon.Stopwatch,
        tintColor,
      }}
      title={title}
      tooltip={`${phaseLabel(state.phase)} — ${formatTime(left)}`}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View Statistics"
          icon={Icon.BarChart}
          onAction={() =>
            launchCommand({ name: "stats", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title={phaseLabel(state.phase)}
          subtitle={formatTime(left)}
          icon={{ source: Icon.Circle, tintColor }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Timer">
        {running ? (
          <MenuBarExtra.Item
            title="Pause"
            icon={Icon.Pause}
            onAction={timer.pause}
          />
        ) : (
          <MenuBarExtra.Item
            title={state.status === "paused" ? "Resume" : "Start"}
            icon={Icon.Play}
            onAction={timer.start}
          />
        )}
        <MenuBarExtra.Item
          title="Reset"
          icon={Icon.RotateAntiClockwise}
          onAction={timer.reset}
        />
        <MenuBarExtra.Item
          title="Add 5 Minutes"
          icon={Icon.Plus}
          onAction={() => timer.adjust(5)}
        />
        <MenuBarExtra.Item
          title="Remove 5 Minutes"
          icon={Icon.Minus}
          onAction={() => timer.adjust(-5)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Mode">
        <MenuBarExtra.Item
          title="Focus"
          icon={{ source: Icon.Circle, tintColor: Color.Red }}
          onAction={() => timer.selectPhase("focus")}
        />
        <MenuBarExtra.Item
          title="Short Break"
          icon={{ source: Icon.Circle, tintColor: Color.Green }}
          onAction={() => timer.selectPhase("short-break")}
        />
        <MenuBarExtra.Item
          title="Long Break"
          icon={{ source: Icon.Circle, tintColor: Color.Blue }}
          onAction={() => timer.selectPhase("long-break")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Full Timer"
          icon={Icon.AppWindow}
          onAction={() =>
            launchCommand({ name: "pomodoro", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Settings…"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
