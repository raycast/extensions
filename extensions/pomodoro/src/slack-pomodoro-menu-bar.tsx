import { MenuBarExtra, Icon, launchCommand, LaunchType, Image, Color } from "@raycast/api";
import { useState } from "react";
import { FocusText, LongBreakText, ShortBreakText, TimeStoppedPlaceholder } from "./lib/constants";
import { getCurrentInterval, isPaused, duration, preferences, progress, resetInterval } from "./lib/intervals";
import { secondsToTime } from "./lib/secondsToTime";
import { Interval, IntervalType } from "./lib/types";
import { OAuthService, usePromise } from "@raycast/utils";
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

export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());
  const { isLoading, data: tokenSet, revalidate } = usePromise(async () => slackClient.client.getTokens(), []);

  const token = tokenSet && !tokenSet.isExpired() ? tokenSet.accessToken : undefined;

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
    if (!token) {
      return;
    }
    const interval = await slackCreateInterval(type, token);
    setCurrentInterval(interval);
  }

  async function onPause() {
    if (!token) {
      return;
    }
    const interval = await slackPauseInterval(token);
    setCurrentInterval(interval);
  }

  async function onContinue() {
    if (!token) {
      return;
    }
    const interval = await slackContinueInterval(token);
    setCurrentInterval(interval);
  }

  async function onReset() {
    if (!token) {
      return;
    }
    await slackResetInterval(token);
    setCurrentInterval(undefined);
  }

  async function onRestart() {
    if (!token) {
      return;
    }
    await slackRestartInterval(token);
    setCurrentInterval(getCurrentInterval());
  }

  async function onSignIn() {
    try {
      await slackClient.authorize();
      revalidate();
    } catch (error) {
      console.error("Failed to authorize Slack:", error);
    }
  }

  function onResetWithoutSlack() {
    resetInterval();
    setCurrentInterval(undefined);
  }

  let icon: Image.ImageLike;
  icon = { source: "tomato-0.png", tintColor: IconTint };
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
  }

  const stopedPlaceholder = preferences.hideTimeWhenStopped ? undefined : TimeStoppedPlaceholder;
  const title = currentInterval ? secondsToTime(currentInterval.length - duration(currentInterval)) : stopedPlaceholder;

  if (!isLoading && !token) {
    return (
      <MenuBarExtra icon={icon} title={preferences.enableTimeOnMenuBar ? title : undefined} tooltip={"Pomodoro"}>
        {preferences.enableTimeOnMenuBar ? null : <MenuBarExtra.Item icon="⏰" title={TimeStoppedPlaceholder} />}
        {currentInterval ? (
          <MenuBarExtra.Item title="Reset Timer" icon={Icon.Stop} onAction={onResetWithoutSlack} />
        ) : null}
        <MenuBarExtra.Item title="Sign in to Slack" icon={Icon.Lock} onAction={onSignIn} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={icon}
      title={preferences.enableTimeOnMenuBar ? title : undefined}
      tooltip={"Pomodoro"}
      isLoading={isLoading}
    >
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
            onAction={() => onStart("focus")}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <MenuBarExtra.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            onAction={() => onStart("short-break")}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <MenuBarExtra.Item
            title={LongBreakText}
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
