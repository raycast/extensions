import {
  getPreferenceValues,
  Cache,
  updateCommandMetadata,
  environment,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { processBackgroundUpdates } from "./lib/updater";

const cache = new Cache({ namespace: "gram-extensions-bg" });

function getScheduleLabel(interval: string): string {
  switch (interval) {
    case "manual":
      return "Disabled";
    case "1h":
      return "Hourly";
    case "1d":
      return "Daily";
    case "7d":
      return "Weekly";
    default:
      return "Unknown";
  }
}

function formatSubtitle(content: string, schedule: string): string {
  return `${content} • ${schedule}`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function safeUpdateSubtitle(subtitle: string) {
  try {
    await updateCommandMetadata({ subtitle });
  } catch (error) {
    console.error("Failed to update command metadata:", error);
  }
}

function safeCacheSet(key: string, value: string) {
  try {
    cache.set(key, value);
  } catch (error) {
    console.error(`Failed to write cache key "${key}":`, error);
  }
}

function shouldRunBackgroundCheck(interval: string, lastCheck: number | null, now: number): boolean {
  if (interval === "manual") {
    return false;
  }

  if (lastCheck === null) {
    return true;
  }

  const hoursPassed = (now - lastCheck) / (1000 * 60 * 60);

  switch (interval) {
    case "1h":
      return hoursPassed >= 1;
    case "1d":
      return hoursPassed >= 24;
    case "7d":
      return hoursPassed >= 168;
    default:
      return true;
  }
}

async function run() {
  const prefs = getPreferenceValues<Preferences>();
  const isUserTriggered = environment.launchType === LaunchType.UserInitiated;

  const schedule = getScheduleLabel(prefs.autoUpdateInterval);
  const lastCheck = parseTimestamp(cache.get("last-check"));

  if (lastCheck !== null) {
    await safeUpdateSubtitle(formatSubtitle(`Last checked ${formatTime(lastCheck)}`, schedule));
  } else {
    await safeUpdateSubtitle(formatSubtitle("Auto-update", schedule));
  }

  const now = Date.now();

  if (!isUserTriggered && !shouldRunBackgroundCheck(prefs.autoUpdateInterval, lastCheck, now)) {
    return;
  }

  if (isUserTriggered) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking for extension updates...",
    });
  }

  try {
    const { installed, failed } = await processBackgroundUpdates(prefs.build, { silent: !isUserTriggered });

    safeCacheSet("last-check", now.toString());
    const timeString = formatTime(now);

    if (installed > 0) {
      safeCacheSet("last-update", now.toString());

      const isPartialFailure = failed > 0;
      const message = isPartialFailure
        ? `Updated ${installed}, ${failed} failed`
        : `Updated ${installed} extension${installed === 1 ? "" : "s"}`;

      await safeUpdateSubtitle(formatSubtitle(`${message} • ${timeString}`, schedule));

      if (isUserTriggered) {
        await showToast({
          style: isPartialFailure ? Toast.Style.Failure : Toast.Style.Success,
          title: isPartialFailure ? "Some Updates Failed" : "Updates Installed",
          message,
        });
      }
    } else if (failed > 0) {
      const message = `Failed to install ${failed} extension${failed === 1 ? "" : "s"}`;

      await safeUpdateSubtitle(formatSubtitle(`Update failed • ${timeString}`, schedule));

      if (isUserTriggered) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Installation Failed",
          message,
        });
      }
    } else {
      await safeUpdateSubtitle(formatSubtitle(`Up to date • ${timeString}`, schedule));

      if (isUserTriggered) {
        await showToast({
          style: Toast.Style.Success,
          title: "Everything is up to date",
          message: "No new extension versions found.",
        });
      }
    }
  } catch (error) {
    safeCacheSet("last-check", now.toString());

    await safeUpdateSubtitle(formatSubtitle(`Failed • ${formatTime(now)}`, schedule));

    console.error("Background update failed:", error);

    if (isUserTriggered) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Update check failed",
        message: getErrorMessage(error),
      });
    }
  }
}

export default async function Command() {
  const schedule = getScheduleLabel(getPreferenceValues<Preferences>().autoUpdateInterval);

  try {
    await run();
  } catch (error) {
    console.error("Command failed:", error);

    await safeUpdateSubtitle(formatSubtitle("Error", schedule));

    if (environment.launchType === LaunchType.UserInitiated) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Background update failed",
        message: getErrorMessage(error),
      });
    }
  }
}
