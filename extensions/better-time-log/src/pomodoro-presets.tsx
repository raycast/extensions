import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { startTimer as persistStartTimer, type StartTimerPayload } from "./lib/timer-store";

interface Preset {
  id: string;
  title: string;
  description: string;
  payload: StartTimerPayload;
  detail: string;
}

const PRESETS: Preset[] = [
  {
    id: "classic",
    title: "25/5 Pomodoro",
    description: "4 focus blocks",
    detail: "Focus 25m · Break 5m · 4 cycles",
    payload: {
      mode: "pomodoro",
      title: "Pomodoro",
      pomodoro: {
        focusMinutes: 25,
        breakMinutes: 5,
        cycles: 4,
      },
    },
  },
  {
    id: "deep-work",
    title: "50/10 Deep Work",
    description: "2 long blocks",
    detail: "Focus 50m · Break 10m · 2 cycles",
    payload: {
      mode: "pomodoro",
      title: "Deep Work",
      pomodoro: {
        focusMinutes: 50,
        breakMinutes: 10,
        cycles: 2,
      },
    },
  },
  {
    id: "express",
    title: "15/3 Speed Round",
    description: "Quick bursts",
    detail: "Focus 15m · Break 3m · 6 cycles",
    payload: {
      mode: "pomodoro",
      title: "Speed Round",
      pomodoro: {
        focusMinutes: 15,
        breakMinutes: 3,
        cycles: 6,
      },
    },
  },
  {
    id: "balanced",
    title: "40/10 Balanced",
    description: "3 mid-length blocks",
    detail: "Focus 40m · Break 10m · 3 cycles",
    payload: {
      mode: "pomodoro",
      title: "Balanced Focus",
      pomodoro: {
        focusMinutes: 40,
        breakMinutes: 10,
        cycles: 3,
      },
    },
  },
];

export default function PomodoroPresetsCommand() {
  const handleStart = async (preset: Preset) => {
    try {
      const timer = await persistStartTimer(preset.payload);
      await showToast({ style: Toast.Style.Success, title: "Pomodoro started", message: timer.title });
      await refreshMenuBarCommand();
    } catch (error) {
      const title =
        error instanceof Error && error.message === "ACTIVE_TIMER_EXISTS"
          ? "A timer is already running"
          : "Unable to start preset";
      await showToast({ style: Toast.Style.Failure, title });
    }
  };

  return (
    <List searchBarPlaceholder="Search presets">
      <List.Section title="Pomodoro Presets">
        {PRESETS.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.title}
            subtitle={preset.description}
            accessories={[{ tag: { value: preset.detail } }]}
            icon={Icon.Timer}
            actions={
              <ActionPanel>
                <Action
                  title="Start Preset"
                  icon={Icon.Play}
                  onAction={() => {
                    void handleStart(preset);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
