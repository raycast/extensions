import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  formatStateSubtitle,
  getProcessSnapshot,
  getRunningState,
  resetCaffeineState,
  startCaffeine,
  stopCaffeine,
  type ProcessSnapshot,
  type RunningCaffeineState,
} from "./lib/caffeine";

type Preset = {
  title: string;
  minutes?: number;
};

const presets: Preset[] = [
  { title: "Start Indefinitely" },
  { title: "Start For 15 Minutes", minutes: 15 },
  { title: "Start For 30 Minutes", minutes: 30 },
  { title: "Start For 1 Hour", minutes: 60 },
  { title: "Start For 2 Hours", minutes: 120 },
  { title: "Start For 4 Hours", minutes: 240 },
];

async function showSuccessToast(title: string, message: string) {
  await showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

export default function Command() {
  const [state, setState] = useState<RunningCaffeineState | null>(null);
  const [processSnapshot, setProcessSnapshot] = useState<ProcessSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshState() {
    const nextState = await getRunningState();
    const nextSnapshot = getProcessSnapshot();
    setState(nextState);
    setProcessSnapshot(nextSnapshot);
  }

  useEffect(() => {
    refreshState().finally(() => setIsLoading(false));

    const timer = setInterval(() => {
      refreshState().catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  async function handleStart(minutes?: number) {
    const durationMs = minutes ? minutes * 60 * 1000 : undefined;
    const nextState = await startCaffeine({ durationMs, keepDisplayAwake: true });
    const nextSnapshot = getProcessSnapshot();
    setState(nextState);
    setProcessSnapshot(nextSnapshot);
    await showSuccessToast("Agent Awake Enabled", minutes ? `Running for ${minutes} minutes` : "Running");
  }

  async function handleStop() {
    await stopCaffeine();
    setState(null);
    setProcessSnapshot(null);
    await showSuccessToast("Agent Awake Disabled", "Back to normal");
  }

  async function handleReset() {
    await resetCaffeineState();
    setState(null);
    setProcessSnapshot(null);
    await showSuccessToast("Agent Awake Reset", "Tracked process cleared");
  }

  const isActive = Boolean(state);
  const statusTitle = isActive ? "Disable Agent Awake" : "Enable Agent Awake";
  const statusSubtitle = formatStateSubtitle(state);
  const activeEndsAt = state?.endsAt
    ? new Date(state.endsAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Keep AI agents and your computer awake">
      <List.Section title="Status">
        <List.Item
          title={statusTitle}
          subtitle={statusSubtitle}
          icon={isActive ? Icon.Pause : Icon.MugSteam}
          accessories={
            activeEndsAt ? [{ text: `Until ${activeEndsAt}` }] : [{ text: isActive ? "Active" : "Inactive" }]
          }
          actions={
            <ActionPanel>
              {isActive ? (
                <Action title="Disable Agent Awake" icon={Icon.Stop} onAction={handleStop} />
              ) : (
                <Action title="Enable Agent Awake" icon={Icon.Play} onAction={() => handleStart()} />
              )}
              {!isActive &&
                presets
                  .filter((preset) => preset.minutes)
                  .map((preset) => (
                    <Action
                      key={preset.title}
                      title={preset.title}
                      icon={Icon.Clock}
                      onAction={() => handleStart(preset.minutes)}
                    />
                  ))}
              <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refreshState} />
            </ActionPanel>
          }
        />
      </List.Section>

      {!isActive ? (
        <List.Section title="Presets">
          {presets.map((preset) => (
            <List.Item
              key={preset.title}
              title={preset.title}
              subtitle={
                preset.minutes
                  ? "Keep the display and system awake until the timer ends."
                  : "Stay awake until you stop it."
              }
              icon={preset.minutes ? Icon.Clock : Icon.MugSteam}
              actions={
                <ActionPanel>
                  <Action title={preset.title} onAction={() => handleStart(preset.minutes)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Diagnostics">
        <List.Item
          title={processSnapshot ? `Tracked Process PID ${processSnapshot.pid}` : "No Tracked Process"}
          subtitle={
            processSnapshot
              ? processSnapshot.isRunning
                ? `Running${processSnapshot.processName ? ` as ${processSnapshot.processName}` : ""}.`
                : "Not running anymore. You can reset the saved state."
              : "No saved helper process is currently tracked."
          }
          icon={processSnapshot?.isRunning ? Icon.Dot : Icon.XMarkCircle}
          accessories={
            processSnapshot ? [{ text: processSnapshot.isRunning ? "Running" : "Stopped" }] : [{ text: "None" }]
          }
          actions={
            <ActionPanel>
              <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refreshState} />
              <Action title="Force Reset State" icon={Icon.Stop} onAction={handleReset} />
              {processSnapshot?.isRunning ? (
                <Action title="Stop Tracked Process" icon={Icon.Pause} onAction={handleStop} />
              ) : null}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
