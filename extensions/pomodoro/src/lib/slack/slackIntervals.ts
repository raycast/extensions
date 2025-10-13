import { getPreferenceValues } from "@raycast/api";
import {
  continueInterval,
  createInterval,
  getCompletedPomodoroCount,
  getCurrentInterval,
  intervalDurations,
  pauseInterval,
  resetInterval,
} from "../intervals";
import { Interval, IntervalType } from "../types";
import { clearStatus, endSnooze, setSnooze, setStatus } from "./slackAPI";
import { FocusText, LongBreakText, ShortBreakText } from "../constants";

export async function slackCreateInterval(intervalType: IntervalType, slackToken: string, isFreshStart = true) {
  const intervalMinutes = intervalDurations[intervalType] / 60;
  const slackStatus = slackStatuses[intervalType];
  const slackStatusEmoji = slackStatusEmojis[intervalType];

  await setSnooze(slackToken, intervalMinutes);
  await setStatus(slackToken, slackStatus, slackStatusEmoji, intervalMinutes);

  return createInterval(intervalType, isFreshStart);
}

export async function slackPauseInterval(slackToken: string) {
  await endSnooze(slackToken);
  await clearStatus(slackToken);

  return pauseInterval();
}

export async function slackContinueInterval(slackToken: string) {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return;
  }

  const intervalMinutes = getRemainingTime(currentInterval) / 60;
  const slackStatus = slackStatuses[currentInterval.type];
  const slackStatusEmoji = slackStatusEmojis[currentInterval.type];

  await setSnooze(slackToken, intervalMinutes);
  await setStatus(slackToken, slackStatus, slackStatusEmoji, intervalMinutes);

  return continueInterval();
}

export async function slackResetInterval(slackToken: string) {
  await endSnooze(slackToken);
  await clearStatus(slackToken);

  return resetInterval();
}

export async function slackRestartInterval(slackToken: string) {
  const currentInterval = getCurrentInterval();
  if (currentInterval) {
    const intervalType = currentInterval.type;
    await slackCreateInterval(intervalType, slackToken, false);
  }
}

export function getNextSlackIntervalExecutor() {
  const currentInterval = getCurrentInterval();
  resetInterval();

  const preferences = getPreferenceValues();
  const completedCount = getCompletedPomodoroCount();
  const longBreakThreshold = parseInt(preferences.longBreakStartThreshold, 10);
  let executor: {
    title: string;
    onStart: (slackToken: string) => Promise<Interval | undefined>;
  };

  switch (currentInterval?.type) {
    case "short-break":
      executor = {
        title: FocusText,
        onStart: async (slackToken) => await slackCreateInterval("focus", slackToken, false),
      };
      break;
    case "long-break":
      executor = {
        title: FocusText,
        onStart: async (slackToken) => slackCreateInterval("focus", slackToken),
      };
      break;
    default:
      if (completedCount === longBreakThreshold) {
        executor = {
          title: LongBreakText,
          onStart: async (slackToken) => await slackCreateInterval("long-break", slackToken),
        };
      } else {
        executor = {
          title: ShortBreakText,
          onStart: async (slackToken) => await slackCreateInterval("short-break", slackToken, false),
        };
      }
      break;
  }

  return executor;
}

const getRemainingTime = (interval: Interval): number => {
  let totalPausedTime = 0;

  for (const part of interval.parts) {
    if (!part.pausedAt) continue;

    totalPausedTime += part.pausedAt - part.startedAt;
  }

  const remainingTime = interval.length - totalPausedTime;

  return remainingTime > 0 ? remainingTime : 0;
};

const slackStatuses: Record<IntervalType, string> = {
  focus: "Pomodoro",
  "short-break": "Short Break",
  "long-break": "Long Break",
};

const slackStatusEmojis: Record<IntervalType, string> = {
  focus: ":tomato:",
  "short-break": ":coffee:",
  "long-break": ":coffee:",
};
