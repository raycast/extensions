import { StatusKind } from "./status";

export function createSingleFlight<T>(dedupeWindowMs = 1_000) {
  let current: Promise<T> | undefined;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  return (operation: () => Promise<T>): Promise<T> => {
    if (!current) {
      current = operation();
      const scheduleReset = () => {
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          current = undefined;
          resetTimer = undefined;
        }, dedupeWindowMs);
      };
      void current.then(scheduleReset, scheduleReset);
    }
    return current;
  };
}

export function shouldToggleFromMenuBar(
  launchType: string,
  alreadyActivated: boolean,
  statusKind: StatusKind,
): boolean {
  return (
    launchType === "userInitiated" &&
    alreadyActivated &&
    (statusKind === "off" || statusKind === "on-owned")
  );
}
