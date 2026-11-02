import {
  getPreferenceValues,
  openExtensionPreferences,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as wait } from "node:timers/promises";

const labels = {
  placeId: "Place ID",
  universeId: "Universe ID",
  apiKey: "API Key",
};

export function settings<K extends keyof typeof labels>(
  ...keys: K[]
): Record<K, string> {
  const values = getPreferenceValues<Record<K, string | undefined>>();
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = values[key]?.trim();
    if (!value) throw new Error(`Add ${labels[key]} in settings.`);
    if (
      key !== "apiKey" &&
      (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    ) {
      throw new Error(`${labels[key]} must be a positive number.`);
    }
    result[key] = value;
  }
  return result;
}

export async function run(
  title: string,
  action: (toast: Toast) => Promise<string | void>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await action(toast);
    if (message) {
      toast.style = Toast.Style.Success;
      toast.title = message;
    } else {
      await toast.hide();
    }
  } catch (error) {
    await showError(error, toast);
  }
}

export async function showError(error: unknown, toast?: Toast) {
  const failure =
    toast ??
    (await showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong.",
    }));
  failure.style = Toast.Style.Failure;
  failure.title =
    error instanceof Error ? error.message : "Something went wrong.";
  failure.primaryAction = {
    title: "Open Settings",
    onAction: () => openExtensionPreferences(),
  };
}

export async function runWithDelayedToast(
  title: string,
  action: () => Promise<void>,
) {
  let pendingToast: Promise<Toast | undefined> | undefined;
  const timer = setTimeout(() => {
    pendingToast = showToast({ style: Toast.Style.Animated, title }).catch(
      () => undefined,
    );
  }, 750);

  try {
    await action();
    clearTimeout(timer);
    await (await pendingToast)?.hide();
  } catch (error) {
    clearTimeout(timer);
    await showError(error, await pendingToast);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPlayerCount(universeId: string) {
  const response = await fetch(
    `https://games.roblox.com/v1/games?universeIds=${universeId}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Roblox rate limit reached. Retrying on the next refresh."
        : `Unable to load player count (Roblox ${response.status}).`,
    );
  }

  const body = (await response.json()) as {
    data?: { id?: number; name?: string; playing?: number }[];
  };
  if (!Array.isArray(body?.data)) {
    throw new Error("Roblox returned an invalid player count response.");
  }
  const game = body.data.find((game) => String(game?.id) === universeId);
  if (!game) throw new Error("Universe not found. Check your Universe ID.");
  if (
    typeof game.playing !== "number" ||
    !Number.isSafeInteger(game.playing) ||
    game.playing < 0
  ) {
    throw new Error("Roblox did not return a valid player count.");
  }
  return {
    name: typeof game.name === "string" ? game.name : `Universe ${universeId}`,
    playing: game.playing,
  };
}

const exec = promisify(execFile);
export type Studio = { pid: number; title: string; frontmost: boolean };

const discoveryScript = `
var events = Application("System Events");
var ids = events.applicationProcesses.whose({bundleIdentifier: "com.Roblox.RobloxStudio"}).unixId();
JSON.stringify(ids.map(function(pid) {
  var title = "Roblox Studio";
  var process = events.applicationProcesses.whose({unixId: pid})[0];
  try { title = process.windows[0].name(); } catch (_) {}
  return {pid: pid, title: title.replace(/ - Roblox Studio$/, ""), frontmost: process.frontmost()};
}));
`;

export function errorMessage(error: unknown): string {
  const failure = error as Error & { stderr?: string };
  if (
    /-1743|-1719|assistive access|not authorized/i.test(failure.stderr ?? "")
  ) {
    return "Allow Raycast Accessibility and Automation access in System Settings";
  }
  return failure.stderr
    ? "Couldn't access Studio — check its File menu"
    : failure.message;
}

export async function publish(studio: Studio) {
  try {
    await exec(
      "/usr/bin/osascript",
      [
        "-e",
        `
        tell application "System Events"
          tell (first application process whose unix id is ${studio.pid})
            if not (enabled of menu item "Publish to Roblox" of menu "File" of menu bar 1) then
              error "Publish to Roblox is unavailable in the selected Studio instance"
            end if
            perform action "AXPress" of menu item "Publish to Roblox" of menu "File" of menu bar 1
          end tell
        end tell
      `,
      ],
      { timeout: 30_000 },
    );
  } catch (error) {
    await showHUD(errorMessage(error), {
      popToRootType: PopToRootType.Immediate,
    });
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Publishing ${studio.title}...`,
  });
  await wait(2_000);
  await toast.hide();
}

export async function getStudios(): Promise<Studio[]> {
  const { stdout } = await exec(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", discoveryScript],
    { timeout: 30_000 },
  );
  return JSON.parse(stdout);
}
