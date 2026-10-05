const inFlightLaunches = new Map<string, Promise<unknown>>();

let launchQueue: Promise<void> = Promise.resolve();

export function findDefaultProfileProcessIDs(processList: string): number[] {
  return processList
    .split("\n")
    .flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return [];

      const [, pidText, command] = match;
      if (
        !command.includes("/ChatGPT.app/Contents/MacOS/") ||
        command.includes("--type=") ||
        command.includes("--user-data-dir=")
      ) {
        return [];
      }
      return [Number(pidText)];
    });
}

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

export function serializeProfileLaunch<T>(launch: () => Promise<T>): Promise<T> {
  const pending = launchQueue.then(launch, launch);
  launchQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}
