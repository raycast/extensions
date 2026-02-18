export type TimerFinishedChannel = "system-notification" | "hud" | "toast";

export function buildTimerFinishedNotificationPlan({
  isUserInitiatedLaunch,
}: {
  isUserInitiatedLaunch: boolean;
}): { channels: TimerFinishedChannel[] } {
  void isUserInitiatedLaunch;
  return { channels: ["hud", "system-notification", "toast"] };
}
