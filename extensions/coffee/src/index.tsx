import {
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { formatDuration, startCaffeinate, stopCaffeinate, deviceName, getSchedule } from "./utils";
import { maybeAutoCaffeinate } from "./status";
import { get_caffeinate_state } from "rust:../rust";

interface CaffeinateStatus {
  running: boolean;
  startTime: number | null;
  durationSeconds: number | null;
}

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
  if (process.platform === "win32") {
    return useWindowsCaffeinateInfo(execute);
  }

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

type MutateOptions = { optimisticUpdate?: () => CaffeinateInfo };

function useWindowsCaffeinateInfo(execute: boolean) {
  const [isLoading, setIsLoading] = useState(execute);
  const [data, setData] = useState<CaffeinateInfo>({ isRunning: false, totalSeconds: null, startTime: null });

  const applyState = (info: CaffeinateStatus): CaffeinateInfo => ({
    isRunning: info.running,
    totalSeconds: info.durationSeconds,
    startTime: info.startTime ? info.startTime * 1000 : null,
  });

  useEffect(() => {
    if (!execute) return;
    let disposed = false;

    const refresh = async () => {
      try {
        const info = await get_caffeinate_state();
        if (disposed) return;
        setData(applyState(info));
      } catch {
        if (disposed) return;
        setData({ isRunning: false, totalSeconds: null, startTime: null });
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [execute]);

  const mutate = async (ctx?: Promise<unknown>, options?: MutateOptions) => {
    const previous = data;
    if (options?.optimisticUpdate) setData(options.optimisticUpdate());
    let operationError: unknown;
    if (ctx) {
      try {
        await ctx;
      } catch (e) {
        operationError = e;
      }
    }
    if (operationError) {
      setData(previous);
      throw operationError;
    }
    try {
      const info = await get_caffeinate_state();
      setData(applyState(info));
    } catch {
      // The operation succeeded but the refresh failed; keep the optimistic
      // value, which reflects the completed operation, until a later refresh.
    }
  };

  return { isLoading, data, mutate };
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
    if (isLoading) return;
    void maybeAutoCaffeinate();
  }, [isLoading]);

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
    const reason =
      seconds === null
        ? undefined
        : { kind: "for" as const, endsAt: new Date(Date.now() + seconds * 1000).toISOString() };
    const hudMessage =
      seconds === null
        ? `Caffeinating your ${deviceName()} ${durationLabel}`
        : `Caffeinating your ${deviceName()} for ${durationLabel}`;
    try {
      await mutate(startCaffeinate({ menubar: true, status: true }, hudMessage, additionalArgs, reason), {
        optimisticUpdate: () => ({ isRunning: true, totalSeconds: seconds, startTime: Date.now() }),
      });
    } catch {
      setLocalCaffeinateStatus(null);
    }
  };

  const handleDeactivate = async () => {
    const schedule = await getSchedule();
    const preferences = getPreferenceValues<Preferences.Index>();
    if (schedule != undefined && schedule.IsRunning == true && !preferences.decaffeinatePausesSchedules) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Caffeination schedule running",
        message: "Pause to decaffeinate",
        primaryAction: {
          title: "Open Schedules",
          onAction: () => launchCommand({ name: "addSchedule", type: LaunchType.UserInitiated }),
        },
      });
      return;
    }
    try {
      await mutate(
        stopCaffeinate({ menubar: true, status: true }, undefined, {
          pauseRunningSchedule: schedule != undefined && schedule.IsRunning == true,
        }),
        { optimisticUpdate: () => ({ isRunning: false, totalSeconds: null, startTime: null }) },
      );
    } catch {
      setLocalCaffeinateStatus(null);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to decaffeinate",
        message: "Caffeination may still be running",
      });
      return;
    }
    setLocalCaffeinateStatus(false);
    if (preferences.hidenWhenDecaffeinated) {
      showHUD(`Your ${deviceName()} is now decaffeinated`);
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
