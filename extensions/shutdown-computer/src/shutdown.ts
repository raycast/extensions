import {
  closeMainWindow,
  LaunchProps,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import {
  abortExistingShutdown,
  execFileAsync,
  formatDuration,
  SHUTDOWN_TARGET_TIME_KEY,
  WINDOWS_SHUTDOWN_LIMIT_SECONDS,
} from "./shutdown-utils";

type Arguments = {
  amount: string;
  unit: "seconds" | "minutes" | "hours";
};

const unitMultipliers: Record<Arguments["unit"], number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
};

function parsePositiveWholeNumber(rawAmount: string): number {
  const normalizedAmount = rawAmount.trim();

  if (!/^\d+$/.test(normalizedAmount)) {
    throw new Error("Enter a whole number greater than zero.");
  }

  const amount = Number(normalizedAmount);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Enter a whole number greater than zero.");
  }

  return amount;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Scheduling shutdown...",
  });

  try {
    const amount = parsePositiveWholeNumber(props.arguments.amount);
    const totalSeconds = amount * unitMultipliers[props.arguments.unit];

    if (totalSeconds > WINDOWS_SHUTDOWN_LIMIT_SECONDS) {
      throw new Error(
        `Time exceeds the Windows limit of ${WINDOWS_SHUTDOWN_LIMIT_SECONDS} seconds.`,
      );
    }

    await abortExistingShutdown();
    await execFileAsync("shutdown", ["/s", "/t", String(totalSeconds)]);
    await LocalStorage.setItem(
      SHUTDOWN_TARGET_TIME_KEY,
      Date.now() + totalSeconds * 1000,
    );
    await closeMainWindow();

    toast.style = Toast.Style.Success;
    toast.title = "Shutdown scheduled";
    toast.message = `Computer will shut down in ${formatDuration(totalSeconds)}.`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not schedule shutdown";
    toast.message = error instanceof Error ? error.message : "Unknown error.";
  }
}
