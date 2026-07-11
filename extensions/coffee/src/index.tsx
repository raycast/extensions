import {
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  showHUD,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatDuration, startCaffeinate, stopCaffeinate } from "./utils";

function parseEtime(etime: string): number {
  const parts = etime.split(":").reverse();
  const seconds = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;

  let hours = parts[2] ? parseInt(parts[2]) : 0;
  let days = 0;

  if (parts[2] && parts[2].includes("-")) {
    const dayHour = parts[2].split("-");
    days = parseInt(dayHour[0]) || 0;
    hours = parseInt(dayHour[1]) || 0;
  }

  return seconds + minutes * 60 + hours * 3600 + days * 86400;
}

interface CaffeinateInfo {
  isRunning: boolean;
  totalSeconds: number | null;
  startTime: number | null;
}

const DURATION_PRESETS: { label: string; seconds: number }[] = [
  { label: "10 Minutes", seconds: 10 * 60 },
  { label: "30 Minutes", seconds: 30 * 60 },
  { label: "1 Hour", seconds: 1 * 3600 },
  { label: "2 Hours", seconds: 2 * 3600 },
  { label: "4 Hours", seconds: 4 * 3600 },
  { label: "8 Hours", seconds: 8 * 3600 },
  { label: "12 Hours", seconds: 12 * 3600 },
];

function useCaffeinateInfo(execute: boolean) {
  const { isLoading, data, mutate } = useExec("ps -o etime,args= -p $(pgrep caffeinate) 2>/dev/null", [], {
    shell: true,
    execute,
    parseOutput: (output): CaffeinateInfo => {
      const stdout = output.stdout.trim();
      if (!stdout) {
        return { isRunning: false, totalSeconds: null, startTime: null };
      }

      const lines = stdout.split("\n");
      const [etime, ...cmdArgs] = lines[lines.length - 1].trim().split(/\s+/);

      const secondsRunning = parseEtime(etime);
      const timeoutMatch = cmdArgs.join(" ").match(/-t (\d+)/);
      const totalSeconds = timeoutMatch ? parseInt(timeoutMatch[1]) : null;
      const startTime = Date.now() - secondsRunning * 1000;

      return { isRunning: true, totalSeconds, startTime };
    },
  });

  return {
    isLoading,
    data: data ?? { isRunning: false, totalSeconds: null, startTime: null },
    mutate,
  };
}

export default function Command(props: LaunchProps) {
  const hasLaunchContext = props.launchContext?.caffeinated !== undefined;

  const { isLoading, data, mutate } = useCaffeinateInfo(true);

  const caffeinateStatus = hasLaunchContext ? props?.launchContext?.caffeinated : data.isRunning;
  const caffeinateLoader = hasLaunchContext ? false : isLoading;
  const preferences = getPreferenceValues<Preferences.Index>();

  const [localCaffeinateStatus, setLocalCaffeinateStatus] = useState<boolean | null>(null);
  const [, setTick] = useState(0);

  const displayCaffeinateStatus = localCaffeinateStatus ?? caffeinateStatus;

  useEffect(() => {
    setLocalCaffeinateStatus(null);
  }, [caffeinateStatus]);

  useEffect(() => {
    if (!displayCaffeinateStatus || data.totalSeconds === null || data.startTime === null) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [displayCaffeinateStatus, data.totalSeconds, data.startTime]);

  const liveRemaining = (() => {
    if (!displayCaffeinateStatus || data.totalSeconds === null || data.startTime === null) return null;
    const remain = data.totalSeconds - Math.floor((Date.now() - data.startTime) / 1000);
    return remain > 0 ? `${formatDuration(remain)} remain` : null;
  })();

  const indefinitelyActive = displayCaffeinateStatus && data.totalSeconds === null;

  const untilActive =
    displayCaffeinateStatus &&
    data.totalSeconds !== null &&
    data.startTime !== null &&
    !DURATION_PRESETS.some((p) => p.seconds === data.totalSeconds);

  const untilSubtitle = (() => {
    if (!untilActive || data.totalSeconds === null || data.startTime === null) return undefined;
    const target = new Date(data.startTime + data.totalSeconds * 1000);
    const time = target.toLocaleTimeString([], { timeStyle: "short" });
    const sameDay = target.toDateString() === new Date().toDateString();
    const targetLabel = sameDay ? time : `${target.toLocaleDateString([], { weekday: "short" })} ${time}`;
    return liveRemaining ? `${targetLabel} — ${liveRemaining}` : targetLabel;
  })();

  const handleStartFor = async (seconds: number | null, durationLabel: string) => {
    setLocalCaffeinateStatus(true);
    const additionalArgs = seconds === null ? undefined : `-t ${seconds}`;
    const hudMessage =
      seconds === null ? `Caffeinating your Mac ${durationLabel}` : `Caffeinating your Mac for ${durationLabel}`;
    await mutate(startCaffeinate({ menubar: true, status: true }, hudMessage, additionalArgs), {
      optimisticUpdate: () => ({ isRunning: true, totalSeconds: seconds, startTime: Date.now() }),
    });
  };

  const handleDeactivate = async () => {
    setLocalCaffeinateStatus(false);
    await mutate(stopCaffeinate({ menubar: true, status: true }), {
      optimisticUpdate: () => ({ isRunning: false, totalSeconds: null, startTime: null }),
    });
    if (preferences.hidenWhenDecaffeinated) {
      showHUD("Your Mac is now decaffeinated");
    }
  };

  if (preferences.hidenWhenDecaffeinated && !displayCaffeinateStatus && !isLoading) {
    return null;
  }

  return (
    <MenuBarExtra
      isLoading={caffeinateLoader}
      icon={
        displayCaffeinateStatus
          ? { source: `${preferences.icon}-filled.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-empty.svg`, tintColor: Color.PrimaryText }
      }
    >
      {isLoading ? null : (
        <>
          {displayCaffeinateStatus && <MenuBarExtra.Item title="Decaffeinate" onAction={handleDeactivate} />}
          <MenuBarExtra.Section title="Caffeinate">
            <MenuBarExtra.Item
              title="Indefinitely"
              icon={indefinitelyActive ? Icon.Checkmark : undefined}
              onAction={indefinitelyActive ? handleDeactivate : () => handleStartFor(null, "indefinitely")}
            />
            {DURATION_PRESETS.map(({ label, seconds }) => {
              const isActive = displayCaffeinateStatus && data.totalSeconds === seconds;
              return (
                <MenuBarExtra.Item
                  key={label}
                  title={label}
                  subtitle={isActive ? (liveRemaining ?? undefined) : undefined}
                  icon={isActive ? Icon.Checkmark : undefined}
                  onAction={isActive ? handleDeactivate : () => handleStartFor(seconds, label.toLowerCase())}
                />
              );
            })}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Until…"
              subtitle={untilSubtitle}
              icon={untilActive ? Icon.Checkmark : undefined}
              onAction={
                untilActive
                  ? handleDeactivate
                  : () => launchCommand({ name: "caffeinateUntil", type: LaunchType.UserInitiated })
              }
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
