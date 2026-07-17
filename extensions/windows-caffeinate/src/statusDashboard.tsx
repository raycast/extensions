import { Action, ActionPanel, Color, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CaffeinationInfo, formatDuration, getCaffeinationInfo, startCaffeinate, stopCaffeinate } from "./utils";

// Windows doesn't support Raycast's persistent MenuBarExtra, so this view
// command is the closest equivalent to the Mac version's menu bar command:
// open it any time to see live status and flip caffeination on/off.
const EMPTY_INFO: CaffeinationInfo = { running: false, totalSeconds: null, elapsedSeconds: null, watchPid: null };

const DURATION_PRESETS: { label: string; seconds: number }[] = [
  { label: "10 Minutes", seconds: 10 * 60 },
  { label: "30 Minutes", seconds: 30 * 60 },
  { label: "1 Hour", seconds: 1 * 3600 },
  { label: "2 Hours", seconds: 2 * 3600 },
  { label: "4 Hours", seconds: 4 * 3600 },
  { label: "8 Hours", seconds: 8 * 3600 },
  { label: "12 Hours", seconds: 12 * 3600 },
];

export default function Command() {
  const { isLoading, data, mutate, revalidate } = usePromise(getCaffeinationInfo, []);
  const info = data ?? EMPTY_INFO;

  // getCaffeinationInfo() only tells us elapsedSeconds as of the moment it
  // ran. To animate a live per-second countdown between polls, anchor that
  // sample to a wall-clock epoch and recompute against Date.now() on every
  // tick — the same trick the Mac version uses (startTime = Date.now() -
  // secondsRunning*1000) instead of a countdown that's frozen until refetch.
  const [anchorEpoch, setAnchorEpoch] = useState<number | null>(null);
  useEffect(() => {
    if (info.running && info.totalSeconds !== null && info.elapsedSeconds !== null) {
      setAnchorEpoch(Date.now() - info.elapsedSeconds * 1000);
    } else {
      setAnchorEpoch(null);
    }
  }, [info.running, info.totalSeconds, info.elapsedSeconds]);

  const [, setTick] = useState(0);
  useEffect(() => {
    if (anchorEpoch === null) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [anchorEpoch]);

  // Poll the real process state periodically so the dashboard notices things
  // it didn't cause itself: a timed caffeination expiring on its own, a
  // watched app closing, or a schedule starting/stopping caffeination.
  useEffect(() => {
    const poll = setInterval(() => revalidate(), 5000);
    return () => clearInterval(poll);
  }, [revalidate]);

  const liveRemaining = (() => {
    if (anchorEpoch === null || info.totalSeconds === null) return null;
    const elapsed = Math.floor((Date.now() - anchorEpoch) / 1000);
    const remain = info.totalSeconds - elapsed;
    return remain > 0 ? `${formatDuration(remain)} remain` : null;
  })();

  const whileAppActive = info.running && info.watchPid !== null;
  const indefinitelyActive = info.running && info.totalSeconds === null && !whileAppActive;
  const untilActive =
    info.running &&
    !whileAppActive &&
    info.totalSeconds !== null &&
    !DURATION_PRESETS.some((p) => p.seconds === info.totalSeconds);

  const handleStartFor = async (seconds: number | null, durationLabel: string) => {
    const hudMessage =
      seconds === null ? `Caffeinating your PC ${durationLabel}` : `Caffeinating your PC for ${durationLabel}`;
    try {
      await mutate(
        startCaffeinate({ status: true }, hudMessage, seconds === null ? undefined : { durationSeconds: seconds }),
        {
          optimisticUpdate: () => ({ running: true, totalSeconds: seconds, elapsedSeconds: 0, watchPid: null }),
        },
      );
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to caffeinate", String(error));
    }
  };

  const handleDeactivate = async () => {
    try {
      await mutate(stopCaffeinate({ status: true }, "Your PC is now decaffeinated"), {
        optimisticUpdate: () => EMPTY_INFO,
      });
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to decaffeinate", String(error));
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Status">
        <List.Item
          title={info.running ? "Caffeinated" : "Decaffeinated"}
          subtitle={
            whileAppActive ? "While app is running" : indefinitelyActive ? "Indefinitely" : (liveRemaining ?? undefined)
          }
          icon={{ source: info.running ? Icon.MugSteam : Icon.Mug, tintColor: info.running ? Color.Yellow : undefined }}
          actions={
            <ActionPanel>
              {info.running && <Action title="Decaffeinate" icon={Icon.XMarkCircle} onAction={handleDeactivate} />}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Caffeinate">
        <List.Item
          title="Indefinitely"
          icon={indefinitelyActive ? Icon.Checkmark : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title={indefinitelyActive ? "Decaffeinate" : "Caffeinate Indefinitely"}
                onAction={indefinitelyActive ? handleDeactivate : () => handleStartFor(null, "indefinitely")}
              />
            </ActionPanel>
          }
        />
        {DURATION_PRESETS.map(({ label, seconds }) => {
          const isActive = info.running && info.totalSeconds === seconds;
          return (
            <List.Item
              key={label}
              title={label}
              subtitle={isActive ? (liveRemaining ?? undefined) : undefined}
              icon={isActive ? Icon.Checkmark : Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title={isActive ? "Decaffeinate" : `Caffeinate for ${label}`}
                    onAction={isActive ? handleDeactivate : () => handleStartFor(seconds, label.toLowerCase())}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section>
        <List.Item
          title="Until…"
          subtitle={untilActive ? (liveRemaining ?? undefined) : undefined}
          icon={untilActive ? Icon.Checkmark : Icon.Clock}
          actions={
            <ActionPanel>
              <Action
                title={untilActive ? "Decaffeinate" : "Caffeinate Until…"}
                onAction={
                  untilActive
                    ? handleDeactivate
                    : () => launchCommand({ name: "caffeinateUntil", type: LaunchType.UserInitiated })
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="While App Is Running…"
          subtitle={whileAppActive ? "Active" : undefined}
          icon={whileAppActive ? Icon.Checkmark : Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action
                title={whileAppActive ? "Decaffeinate" : "Caffeinate While App Is Running…"}
                onAction={
                  whileAppActive
                    ? handleDeactivate
                    : () => launchCommand({ name: "caffeinateWhile", type: LaunchType.UserInitiated })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
