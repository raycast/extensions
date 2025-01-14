import { MenuBarExtra, Icon, Image, Color } from "@raycast/api";
import { useState } from "react";
import { FocusText, LongBreakText, ShortBreakText, TimeStoppedPlaceholder } from "./lib/constants";
import {
  createInterval,
  getCurrentInterval,
  resetInterval,
  restartInterval,
  pauseInterval,
  continueInterval,
  isPaused,
  duration,
  preferences,
  progress,
  endOfInterval,
} from "./lib/intervals";
import { secondsToTime } from "./lib/secondsToTime";
import { Interval, IntervalType } from "./lib/types";
import { checkDNDExtensionInstall, setDND } from "./lib/doNotDisturb";

const IconTint: Color.Dynamic = {
  light: "#000000",
  dark: "#FFFFFF",
  adjustContrast: false,
};

export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());

  if (currentInterval && progress(currentInterval) >= 100) {
    endOfInterval(currentInterval);
  }

  async function onStart(type: IntervalType) {
    await checkDNDExtensionInstall();
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
    setDND(false);
  }

  function onRestart() {
    restartInterval();
    setCurrentInterval(getCurrentInterval());
  }

  let icon: Image.ImageLike;
  icon = { source: "tomato-0.png", tintColor: IconTint };
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
  }

  const stopedPlaceholder = preferences.hideTimeWhenStopped ? undefined : TimeStoppedPlaceholder;
  const title = currentInterval ? secondsToTime(currentInterval.length - duration(currentInterval)) : stopedPlaceholder;

  return (
    <MenuBarExtra icon={icon} title={preferences.enableTimeOnMenuBar ? title : undefined} tooltip={"Pomodoro"}>
      {preferences.enableTimeOnMenuBar ? null : <MenuBarExtra.Item icon="⏰" title={TimeStoppedPlaceholder} />}
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
            title="Restart Current"
            icon={Icon.Repeat}
            onAction={onRestart}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title={FocusText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            onAction={async () => await onStart("focus")}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <MenuBarExtra.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            onAction={async () => await onStart("short-break")}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <MenuBarExtra.Item
            title={LongBreakText}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            onAction={async () => await onStart("long-break")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
