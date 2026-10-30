import {
  Color,
  Icon,
  LaunchProps,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  formatDuration,
  startCaffeinate,
  stopCaffeinate,
  deviceName,
  prepareUserStop,
  getCaffeinationState,
  stopLegacyCaffeinate,
  CaffeinationState,
} from "./utils";
import { maybeAutoCaffeinate } from "./status";
import { useMenuVisibility } from "./hooks/useMenuVisibility";

const DURATION_PRESETS: { label: string; seconds: number }[] = [
  { label: "10 Minutes", seconds: 10 * 60 },
  { label: "30 Minutes", seconds: 30 * 60 },
  { label: "1 Hour", seconds: 1 * 3600 },
  { label: "2 Hours", seconds: 2 * 3600 },
  { label: "4 Hours", seconds: 4 * 3600 },
  { label: "8 Hours", seconds: 8 * 3600 },
  { label: "12 Hours", seconds: 12 * 3600 },
];

function useCaffeinateInfo() {
  // Raycast relaunches the menu bar command on every click; the cached result
  // keeps the menu populated while the fresh process scan runs.
  const result = useCachedPromise(getCaffeinationState, [], { onError: () => {} });
  const { revalidate } = result;
  useEffect(() => {
    const interval = setInterval(() => revalidate(), process.platform === "win32" ? 5000 : 60000);
    return () => clearInterval(interval);
  }, [revalidate]);
  return result;
}

const EMPTY_STATE: CaffeinationState = {
  isRunning: false,
  isManaged: false,
  sessionId: null,
  externalCount: process.platform === "win32" ? null : 0,
  totalSeconds: null,
  startTime: null,
};

export default function Command(props: LaunchProps) {
  const [cachedCaffeinated, setCachedCaffeinated] = useCachedState<boolean>("caffeinateStatus");
  const { isLoading, data: state, mutate, error } = useCaffeinateInfo();
  const data = state ?? EMPTY_STATE;
  // While loading, `state` may be the snapshot saved by an earlier launch. Rows can
  // show it, but the icon and caffeinateStatus follow only this launch's own scan,
  // falling back to the flag the start/stop handlers keep current.
  const isFresh = Boolean(state) && !isLoading && !error;
  const displayCaffeinateStatus = isFresh ? state?.isRunning : (cachedCaffeinated ?? state?.isRunning);
  const preferences = getPreferenceValues<Preferences.Index>();
  const isHideEnabled = Boolean(preferences.hidenWhenDecaffeinated);

  const [, setTick] = useState(0);

  useEffect(() => {
    if (isFresh && state) setCachedCaffeinated(state.isRunning);
  }, [isFresh, state, setCachedCaffeinated]);

  const isUserInitiated = props.launchType === LaunchType.UserInitiated;
  const { isVisible, keepVisibleAfterStop } = useMenuVisibility({
    isRunning: displayCaffeinateStatus,
    isUserInitiated,
    initialUserInitiated: isUserInitiated || environment.launchType === LaunchType.UserInitiated,
    hideWhenInactive: isHideEnabled,
    isLoading,
    hasError: Boolean(error),
  });

  useEffect(() => {
    if (isLoading || error) return;
    void maybeAutoCaffeinate().catch(console.error);
  }, [isLoading, error]);

  useEffect(() => {
    if (!data.isManaged || data.totalSeconds === null || data.startTime === null) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [data.isManaged, data.totalSeconds, data.startTime]);

  const liveRemaining = (() => {
    if (!data.isManaged || data.totalSeconds === null || data.startTime === null) return null;
    const remain = data.totalSeconds - Math.floor((Date.now() - data.startTime) / 1000);
    return remain > 0 ? `${formatDuration(remain)} remain` : null;
  })();

  const indefinitelyActive = data.isManaged && data.totalSeconds === null;

  const untilActive =
    data.isManaged &&
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
    setCachedCaffeinated(true);
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
        optimisticUpdate: () => ({
          ...data,
          isRunning: true,
          isManaged: true,
          sessionId: null,
          totalSeconds: seconds,
          startTime: Date.now(),
          reason,
        }),
      });
    } catch (error) {
      setCachedCaffeinated(data.isRunning);
      await showToast({ style: Toast.Style.Failure, title: "Failed to caffeinate", message: String(error) });
    }
  };

  const handleStopLegacy = async () => {
    if (!data.legacySession) return;
    try {
      const operation = stopLegacyCaffeinate({ menubar: true, status: true }, data.legacySession);
      await mutate(operation);
      const stopped = await operation;
      setCachedCaffeinated(stopped.isRunning);
      if (isHideEnabled && !stopped.isRunning) keepVisibleAfterStop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop previous Coffee session",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const legacySubtitle = (() => {
    if (!data.legacySession) return undefined;
    if (data.legacySession.endsAt === null) return "Started before update";
    const remain = Math.floor((data.legacySession.endsAt - Date.now()) / 1000);
    return remain > 0 ? `Started before update — ${formatDuration(remain)} remain` : "Started before update";
  })();
  const externalCount = (data.externalCount ?? 0) - (data.legacySession ? 1 : 0);
  const externalSummary = `${externalCount} ${externalCount === 1 ? "process" : "processes"}`;

  const handleDeactivate = async () => {
    try {
      const decision = await prepareUserStop();
      if (!decision.allowed) return;
      const operation = stopCaffeinate({ menubar: true, status: true }, isHideEnabled, {
        pauseRunningSchedule: decision.pauseRunningSchedule,
      });
      await mutate(operation, {
        optimisticUpdate: () => ({
          ...data,
          isRunning: Boolean(data.externalCount),
          isManaged: false,
          sessionId: null,
          totalSeconds: null,
          startTime: null,
          reason: undefined,
        }),
      });
      const stopped = await operation;
      setCachedCaffeinated(stopped.isRunning);
      if (isHideEnabled && !stopped.isRunning) keepVisibleAfterStop();
    } catch {
      setCachedCaffeinated(data.isRunning);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to decaffeinate",
        message: "Caffeination may still be running",
      });
      return;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <MenuBarExtra
      // Keep Raycast from unloading the command before its own scan has landed.
      isLoading={isLoading}
      icon={
        displayCaffeinateStatus
          ? { source: `${preferences.icon}-filled.svg`, tintColor: Color.PrimaryText }
          : { source: `${preferences.icon}-empty.svg`, tintColor: Color.PrimaryText }
      }
    >
      {error ? (
        <MenuBarExtra.Item title="Caffeination status unavailable" />
      ) : isLoading && !state ? null : (
        <>
          {/* The menu renders cached state, then the fresh scan while it may be open.
              Raycast leaves blank rows when an open menu inserts or removes rows, so
              these rows always exist and only their text and action change. */}
          {data.externalCount !== null &&
            (data.legacySession ? (
              <MenuBarExtra.Item
                title="Stop Previous Coffee Session"
                subtitle={externalCount > 0 ? `${legacySubtitle} · ${externalCount} external` : legacySubtitle}
                onAction={handleStopLegacy}
              />
            ) : (
              // Keep a subtitle: Raycast blanks an open row whose subtitle is removed.
              <MenuBarExtra.Item
                title="External caffeination"
                subtitle={externalCount > 0 ? externalSummary : "None"}
              />
            ))}
          <MenuBarExtra.Item
            title="Stop Coffee Caffeination"
            onAction={data.isManaged ? handleDeactivate : undefined}
          />
          <MenuBarExtra.Section title="Caffeinate">
            <MenuBarExtra.Item
              title="Indefinitely"
              icon={indefinitelyActive ? Icon.Checkmark : undefined}
              onAction={indefinitelyActive ? handleDeactivate : () => handleStartFor(null, "indefinitely")}
            />
            {DURATION_PRESETS.map(({ label, seconds }) => {
              const isActive = data.isManaged && data.totalSeconds === seconds;
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
