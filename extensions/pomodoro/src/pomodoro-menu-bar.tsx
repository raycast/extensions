import { MenuBarExtra, Icon, launchCommand, LaunchType, Image, Color } from "@raycast/api";
import { useState } from "react";
import {
  createInterval,
  getCurrentInterval,
  resetInterval,
  pauseInterval,
  continueInterval,
  IntervalType,
  Interval,
  isPaused,
  duration,
  preferences,
  progress,
} from "../lib/intervals";
import { secondsToTime } from "../lib/secondsToTime";

const IconTint: Color.Dynamic = {
  light: "#000000",
  dark: "#FFFFFF",
  adjustContrast: false,
};

export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());

  if (currentInterval && progress(currentInterval) >= 100) {
    try {
      launchCommand({
        name: "pomodoro-control-timer",
        type: LaunchType.UserInitiated,
        context: { currentInterval },
      });
    } catch (error) {
      console.error(error);
    }

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

  let icon: Image.ImageLike;
  icon = { source: "tomato-0.png", tintColor: IconTint };
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
  }

  const title = preferences.enableTimeOnMenuBar
    ? currentInterval
      ? secondsToTime(currentInterval.length - duration(currentInterval))
      : "--:--"
    : undefined;

  return (
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
        </>
      )}
    </MenuBarExtra>
  );
}
