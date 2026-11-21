import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_INACTIVE_STATE, getCurrentState, startCaffeine, stopCaffeine } from "./utils/caffeine";
import { formatDuration, formatRemainingTime } from "./utils/time";
import { CaffeineState, TIMER_PRESETS, TimerPreset } from "./utils/types";

export default function Command() {
  const [state, setState] = useState<CaffeineState>(DEFAULT_INACTIVE_STATE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { push } = useNavigation();

  const refreshState = useCallback(async () => {
    try {
      const current = await getCurrentState();
      setState(current);
    } catch {
      setState(DEFAULT_INACTIVE_STATE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();

    // Live update interval for countdown and state reconciliation
    const interval = setInterval(() => {
      refreshState();
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshState]);

  const handleTurnOn = async () => {
    try {
      setIsLoading(true);
      const newState = await startCaffeine(0);
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: "Caffeine Activated",
        message: "Keeping Windows awake indefinitely",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Activate Caffeine",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async (seconds: number) => {
    const wasActive = state.active;
    try {
      setIsLoading(true);
      const newState = await startCaffeine(seconds);
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: wasActive ? "Caffeine Timer Updated" : "Caffeine Activated",
        message: `Keeping Windows awake for ${formatDuration(seconds)}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: wasActive ? "Failed to Update Timer" : "Failed to Activate Caffeine",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnOff = async () => {
    try {
      setIsLoading(true);
      const newState = await stopCaffeine();
      setState(newState);
      await showToast({
        style: Toast.Style.Success,
        title: "Caffeine Stopped",
        message: "Windows normal power management restored",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Stop Caffeine",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isTimerActive = state.active && typeof state.expiresAt === "number" && state.expiresAt > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Caffeine actions...">
      {/* 1. Active / Inactive Toggle */}
      {state.active ? (
        <List.Item
          title="Turn Off"
          subtitle={
            isTimerActive ? `Active • ${formatRemainingTime(state.expiresAt)} remaining` : "Active (Indefinitely)"
          }
          icon={{ source: Icon.Sun, tintColor: Color.Orange }}
          accessories={[
            {
              tag: {
                value: isTimerActive ? formatRemainingTime(state.expiresAt) : "Active",
                color: Color.Orange,
              },
            },
            {
              text: state.preventDisplaySleep ? "Display: Awake" : "Display: Normal",
              icon: state.preventDisplaySleep ? Icon.Eye : Icon.EyeDisabled,
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Turn Off" icon={{ source: Icon.Stop, tintColor: Color.Red }} onAction={handleTurnOff} />
              <Action
                title={isTimerActive ? "Change Timer…" : "Set Timer…"}
                icon={Icon.Clock}
                onAction={() => push(<TimerView onStart={handleStartTimer} />)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          title="Turn On"
          subtitle="Keep Windows awake indefinitely"
          icon={{ source: Icon.Moon, tintColor: Color.SecondaryText }}
          accessories={[
            {
              tag: {
                value: "Inactive",
                color: Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Turn On" icon={{ source: Icon.Play, tintColor: Color.Green }} onAction={handleTurnOn} />
              <Action
                title="Set Timer…"
                icon={Icon.Clock}
                onAction={() => push(<TimerView onStart={handleStartTimer} />)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {/* 2. Timer Option */}
      <List.Item
        title="Timer…"
        subtitle={
          isTimerActive
            ? `Change timer (currently ${formatRemainingTime(state.expiresAt)} remaining)`
            : "Keep awake for a specific duration or custom minutes"
        }
        icon={Icon.Clock}
        accessories={
          isTimerActive
            ? [
                {
                  tag: {
                    value: formatRemainingTime(state.expiresAt),
                    color: Color.Orange,
                  },
                },
              ]
            : undefined
        }
        actions={
          <ActionPanel>
            <Action
              title={isTimerActive ? "Change Timer…" : "Set Timer…"}
              icon={Icon.Clock}
              onAction={() => push(<TimerView onStart={handleStartTimer} />)}
            />
            {state.active && (
              <Action
                title="Turn Off"
                icon={{ source: Icon.Stop, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
                onAction={handleTurnOff}
              />
            )}
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

function TimerView({ onStart }: { onStart: (seconds: number) => Promise<void> }) {
  const { pop, push } = useNavigation();

  const handleSelectPreset = async (seconds: number) => {
    pop();
    await onStart(seconds);
  };

  return (
    <List searchBarPlaceholder="Filter duration options...">
      <List.Section title="Custom Duration">
        <List.Item
          title="Custom Duration…"
          subtitle="Enter duration in minutes (1 - 10,080)"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action
                title="Enter Custom Minutes…"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <CustomDurationForm
                      onStart={async (seconds) => {
                        pop(); // Pop form
                        pop(); // Pop timer list
                        await onStart(seconds);
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Quick Durations">
        {TIMER_PRESETS.map((preset: TimerPreset) => (
          <List.Item
            key={preset.id}
            title={preset.title}
            subtitle={preset.subtitle}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title={`Start Timer (${preset.title})`}
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  onAction={() => handleSelectPreset(preset.durationSeconds)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CustomDurationForm({ onStart }: { onStart: (seconds: number) => Promise<void> }) {
  const [minutesError, setMinutesError] = useState<string | undefined>();

  const handleSubmit = async (values: { minutes: string }) => {
    const raw = (values.minutes || "").trim();

    // Validate positive integer only: 1 to 10,080 only
    if (!raw || !/^\d+$/.test(raw)) {
      setMinutesError("Enter a duration between 1 and 10,080 minutes.");
      return;
    }

    const minutes = parseInt(raw, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 10080) {
      setMinutesError("Enter a duration between 1 and 10,080 minutes.");
      return;
    }

    setMinutesError(undefined);
    await onStart(minutes * 60);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" shortcut={{ modifiers: [], key: "return" }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="minutes"
        title="Duration (Minutes)"
        placeholder="e.g. 45"
        error={minutesError}
        onChange={() => setMinutesError(undefined)}
      />
    </Form>
  );
}
