export type WindowRecoveryAction = "activate" | "restart" | "launch";

const inFlightLaunches = new Map<string, Promise<unknown>>();

export function findProfileProcessIDs(processList: string, userDataPath: string): number[] {
  const expectedArgument = `--user-data-dir=${userDataPath}`;
  return processList
    .split("\n")
    .flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return [];

      const [, pidText, command] = match;
      const argumentIndex = command.indexOf(expectedArgument);
      if (
        !command.includes("/ChatGPT.app/Contents/MacOS/") ||
        command.includes("--type=") ||
        argumentIndex < 0
      ) {
        return [];
      }

      const nextCharacter = command[argumentIndex + expectedArgument.length];
      if (nextCharacter && !/\s|["']/.test(nextCharacter)) return [];
      return [Number(pidText)];
    });
}

export function recoveryActionForWindowCount(windowCount: number | undefined): WindowRecoveryAction {
  if (windowCount === undefined || !Number.isFinite(windowCount)) return "launch";
  return windowCount > 0 ? "activate" : "restart";
}

export async function coalesceProfileLaunch<T>(profileID: string, launch: () => Promise<T>): Promise<T> {
  const existing = inFlightLaunches.get(profileID);
  if (existing) return existing as Promise<T>;

  const pending = Promise.resolve().then(launch);
  inFlightLaunches.set(profileID, pending);
  try {
    return await pending;
  } finally {
    if (inFlightLaunches.get(profileID) === pending) inFlightLaunches.delete(profileID);
  }
}
