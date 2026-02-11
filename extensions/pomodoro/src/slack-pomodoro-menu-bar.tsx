import { MenuBarExtra, Icon, launchCommand, LaunchType, Image, Color } from "@raycast/api";
import { useState } from "react";
import { FocusText, LongBreakText, ShortBreakText, TimeStoppedPlaceholder } from "./lib/constants";
import { getCurrentInterval, isPaused, duration, preferences, progress } from "./lib/intervals";
import { secondsToTime } from "./lib/secondsToTime";
import { Interval, IntervalType } from "./lib/types";
import { OAuthService, getAccessToken, withAccessToken } from "@raycast/utils";
import {
  slackContinueInterval,
  slackCreateInterval,
  slackPauseInterval,
  slackResetInterval,
  slackRestartInterval,
} from "./lib/slack/slackIntervals";

const IconTint: Color.Dynamic = {
  light: "#000000",
  dark: "#FFFFFF",
  adjustContrast: false,
};

const slackClient = OAuthService.slack({
  scope: "users.profile:write dnd:write",
});

export default withAccessToken(slackClient)(TogglePomodoroTimer);

export function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());
  const { token } = getAccessToken();

  if (currentInterval && progress(currentInterval) >= 100) {
    try {
      launchCommand({
        name: "slack-pomodoro-control-timer",
        type: LaunchType.UserInitiated,
        context: { currentInterval },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function onStart(type: IntervalType) {
    const interval = await slackCreateInterval(type, token);
    setCurrentInterval(interval);
  }

  async function onPause() {
    const interval = await slackPauseInterval(token);
    setCurrentInterval(interval);
  }

  async function onContinue() {
    const interval = await slackContinueInterval(token);
    setCurrentInterval(interval);
  }

  async function onReset() {
    await slackResetInterval(token);
    setCurrentInterval(undefined);
  }

  async function onRestart() {
    await slackRestartInterval(token);
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
              onAction={async () => onContinue()}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : (
            <MenuBarExtra.Item
              title="Pause"
              icon={Icon.Pause}
              onAction={async () => onPause()}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          )}
          <MenuBarExtra.Item
            title="Reset"
            icon={Icon.Stop}
            onAction={async () => onReset()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <MenuBarExtra.Item
            title="Restart Current"
            icon={Icon.Repeat}
            onAction={async () => onRestart()}
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
