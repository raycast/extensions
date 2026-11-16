import { Action, ActionPanel, Icon, List, LaunchProps, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { isMac, isTahoe, readFnState, setFnState } from "./lib/utils";

interface Duration {
  display: string;
  seconds?: number;
  icon: string;
}

const durations: Duration[] = [
  {
    display: "15 seconds",
    seconds: 15,
    icon: "🪥",
  },
  {
    display: "30 seconds",
    seconds: 30,
    icon: "🧽",
  },
  {
    display: "1 minute",
    seconds: 60,
    icon: "🧼",
  },
  {
    display: "2 minutes",
    seconds: 120,
    icon: "🚿",
  },
  {
    display: "5 minutes",
    seconds: 300,
    icon: "🛁",
  },
  {
    display: "1 hour",
    seconds: 3600,
    icon: "🧹",
  },
  {
    display: "24 hours",
    seconds: 86400,
    icon: "🫧",
  },
  {
    display: "Forever",
    icon: "🤯",
  },
];

export default function Command(props: LaunchProps<{ launchContext?: { durationSeconds: number } }>) {
  const { defaultDuration, lockMouse } = getPreferenceValues<Preferences.CleanKeyboard>();
  const lockMouseEnabled = isMac && lockMouse;
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const savedFnState = useRef<boolean | null>(null);
  const autoLockStarted = useRef(false);
  const lockInFlight = useRef(false);

  // "0" is Forever, matching how the duration list treats a missing `seconds`
  const defaultSeconds = defaultDuration && defaultDuration !== "always-ask" ? Number(defaultDuration) : undefined;

  useEffect(() => {
    return () => {
      if (savedFnState.current !== null) {
        try {
          setFnState(savedFnState.current);
        } catch {
          // best-effort restore on unmount
        }
        savedFnState.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning && savedFnState.current !== null) {
      try {
        setFnState(savedFnState.current);
      } catch {
        showToast({
          title: "Could not restore Fn key setting",
          message: "Go to System Settings > Keyboard to restore manually",
          style: Toast.Style.Failure,
        });
      }
      savedFnState.current = null;
    }
  }, [isRunning]);

  const lockAction = useCallback(async (duration: Duration) => {
    if (lockInFlight.current) return;
    lockInFlight.current = true;
    try {
      const { lockFnKeys, lockMouse } = getPreferenceValues<Preferences.CleanKeyboard>();
      let handler: (duration: number | null) => Promise<unknown>;
      if (isMac) {
        const { handler: handlerSwift } = await import("swift:../swift/MyExecutable");
        handler = (seconds) => handlerSwift(seconds, Boolean(lockMouse));
      } else {
        const { handler: handlerRust } = await import("rust:../rust/clean-keyboard");
        handler = handlerRust;
      }
      if (lockFnKeys && isTahoe) {
        try {
          savedFnState.current = readFnState();
          setFnState(true);
        } catch {
          // Keep the saved state so the existing restore effects undo a partial write.
        }
      }
      const durationSeconds = duration.seconds ?? null;
      setTimeLeft(durationSeconds);
      setIcon(duration.icon);
      setIsRunning(true);
      handler(durationSeconds)
        .then(() => showToast({ title: "Keyboard unlocked" }))
        .catch((err) =>
          showToast({ title: "Failed to lock keyboard", message: String(err), style: Toast.Style.Failure }),
        )
        .finally(() => {
          lockInFlight.current = false;
          setIsRunning(false);
          setTimeLeft(null);
          setIcon(null);
        });
      await showToast({ title: isMac && lockMouse ? "Keyboard and mouse clicks locked" : "Keyboard locked" });
    } catch (error) {
      lockInFlight.current = false;
      setIsRunning(false);
      await showToast({ title: "Failed to lock keyboard", message: String(error), style: Toast.Style.Failure });
    }
  }, []);

  useEffect(() => {
    const seconds = props.launchContext?.durationSeconds ?? defaultSeconds;
    if (seconds === undefined || autoLockStarted.current) return;
    const duration =
      durations.find((item) => (item.seconds ?? 0) === seconds) ??
      (Number.isInteger(seconds) && seconds > 0 ? { display: `${seconds} seconds`, seconds, icon: "🧼" } : undefined);
    if (duration) {
      autoLockStarted.current = true;
      lockAction(duration).catch((error) => {
        showToast({ title: "Failed to lock keyboard", message: String(error), style: Toast.Style.Failure });
      });
    }
  }, [defaultSeconds, lockAction, props.launchContext?.durationSeconds]);

  const unlockAction = async () => {
    let stopHandler: () => Promise<void>;
    if (isMac) {
      const { stopHandler: stopHandlerSwift } = await import("swift:../swift/MyExecutable");
      stopHandler = stopHandlerSwift;
    } else {
      const { stop_handler: stopHandlerRust } = await import("rust:../rust/clean-keyboard");
      stopHandler = stopHandlerRust;
    }
    try {
      await stopHandler();
    } catch (err) {
      await showToast({ title: "Failed to unlock keyboard", message: String(err), style: Toast.Style.Failure });
      return;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning && timeLeft) {
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  if (isRunning) {
    return (
      <List>
        <List.EmptyView
          icon={icon ?? "🧼"}
          description={
            lockMouseEnabled
              ? "Press ⌃+U or tap Command 3 times for Touch ID. Escape cancels Touch ID. Hold both Command keys for 8 seconds to force unlock."
              : `Press ${isMac ? "⌃" : "Ctrl"} + U at any time to unlock the keyboard.`
          }
          title={`Cleaning keyboard${timeLeft ? ` for ${timeLeft} seconds…` : ""}`}
          actions={
            <ActionPanel>
              {timeLeft !== null && <Action title={"Back"} onAction={unlockAction} />}
              <Action
                autoFocus={false}
                title={"Unlock Keyboard"}
                shortcut={{ modifiers: ["ctrl"], key: "u" }}
                onAction={unlockAction}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List navigationTitle="Clean Keyboard" searchBarPlaceholder="Lock keyboard for">
      <List.Section title="Durations">
        {durations.map((duration) => (
          <List.Item
            key={duration.display + duration.seconds}
            title={`${duration.display}`}
            icon={duration.icon}
            actions={
              <ActionPanel>
                <Action title="Lock Keyboard" icon={Icon.Lock} onAction={() => lockAction(duration)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
