import { Icon, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

import {
  CACHE_KEY,
  continueInterval,
  createInterval,
  duration,
  getCurrentInterval,
  Interval,
  IntervalType,
  isPaused,
  pauseInterval,
  preferences,
  progress,
  resetInterval,
} from "../lib/intervals";
import { secondsToTime } from "../lib/secondsToTime";

export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useCachedState<Interval | undefined>(CACHE_KEY, undefined);
  const [running, setRunning] = useCachedState<boolean | undefined>("pomodoro_on", true);

  if (currentInterval && progress(currentInterval) >= 100) {
    launchCommand({
      name: "pomodoro-control-timer",
      type: LaunchType.UserInitiated,
      context: { currentInterval },
    });
    resetInterval();
  }

  function onStart(type: IntervalType) {
    setCurrentInterval(createInterval(type));
  }

  function onPause() {
    setCurrentInterval(pauseInterval());
  }

  function onContinue() {
    setCurrentInterval(continueInterval());
  }

  function onReset() {
    resetInterval();
    setCurrentInterval(undefined);
  }

  async function onQuit() {
    onReset();
    setRunning(false);
  }

  let icon;
  icon = { source: { light: "tomato-light.png", dark: "tomato-dark.png" } };
  if (currentInterval) {
    const progressInQuarters = Math.floor(progress(currentInterval) / 25) * 25;
    icon = Icon[(progressInQuarters > 0 ? `CircleProgress${progressInQuarters}` : "Circle") as keyof typeof Icon];
  }

  const title = currentInterval ? secondsToTime(currentInterval.length - duration(currentInterval)) : "--:--";

  return (
    <>
      {!running ? (
        <></>
      ) : (
        <MenuBarExtra icon={icon} title={title} tooltip={"Pomodoro"}>
          {currentInterval ? (
            <>
              {isPaused(currentInterval) ? (
                <MenuBarExtra.Item
                  title="Continue"
                  icon={Icon.Play}
                  onAction={onContinue}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              ) : (
                <MenuBarExtra.Item
                  title="Pause"
                  icon={Icon.Pause}
                  onAction={onPause}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
              )}
              <MenuBarExtra.Item
                title="Reset"
                icon={Icon.Stop}
                onAction={onReset}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <MenuBarExtra.Item
                title={`Quit`}
                icon={`💤`}
                onAction={() => onQuit()}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
              />
            </>
          ) : (
            <>
              <MenuBarExtra.Item
                title={`Focus`}
                subtitle={`${preferences.focusIntervalDuration}:00`}
                icon={`🎯`}
                onAction={() => onStart("focus")}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
              <MenuBarExtra.Item
                title={`Short Break`}
                subtitle={`${preferences.shortBreakIntervalDuration}:00`}
                icon={`🧘‍♂️`}
                onAction={() => onStart("short-break")}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <MenuBarExtra.Item
                title={`Long Break`}
                subtitle={`${preferences.longBreakIntervalDuration}:00`}
                icon={`🚶`}
                onAction={() => onStart("long-break")}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <MenuBarExtra.Item
                title={`Quit`}
                icon={`💤`}
                onAction={() => onQuit()}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
              />
            </>
          )}
        </MenuBarExtra>
      )}
    </>
  );
}
