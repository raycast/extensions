import { setDND } from "../doNotDisturb";
import {
  continueInterval,
  createInterval,
  getCurrentInterval,
  getNextIntervalType,
  intervalDurations,
  pauseInterval,
  resetInterval,
} from "../intervals";
import { Interval, IntervalType } from "../types";
import { clearStatus, endSnooze, setSnooze, setStatus } from "./slackAPI";
import { IntervalTitles } from "../constants";

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

export async function slackSkipInterval(slackToken: string) {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return;
  }

  const nextType = getNextIntervalType(currentInterval.type);
  const interval = await slackCreateInterval(nextType, slackToken, isFreshStart(currentInterval.type, nextType));
  if (currentInterval.type === "focus") {
    setDND(false);
  }
  return interval;
}

export function getNextSlackIntervalExecutor() {
  const currentInterval = getCurrentInterval();
  const nextType = getNextIntervalType(currentInterval?.type);
  resetInterval();

  return {
    title: IntervalTitles[nextType],
    onStart: async (slackToken: string) =>
      slackCreateInterval(nextType, slackToken, isFreshStart(currentInterval?.type, nextType)),
  };
}

// The Slack flow resets the completed-pomodoro counter whenever a long break starts or ends.
// Shared by skip and auto-advance so both transitions count identically.
function isFreshStart(currentType: IntervalType | undefined, nextType: IntervalType): boolean {
  return currentType === "long-break" || nextType === "long-break";
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
