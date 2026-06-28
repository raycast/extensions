import {
  PopToRootType,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { isOverlayRunning, startOverlay } from "./overlay";
import { getBluePillQuote } from "./quotes";

const minSpeedMs = 10;
const maxSpeedMs = 200;

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const alreadyRunning = await isOverlayRunning();

    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    const startPromise = alreadyRunning
      ? undefined
      : startOverlay({
          soundsOn: preferences.soundsOn,
          speedMs: parseSpeedPreference(preferences.speed),
        });

    await showToast({
      style: Toast.Style.Success,
      title: getBluePillQuote(alreadyRunning),
    });

    await startPromise;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "failed to enter the matrix ⛓️‍💥",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseSpeedPreference(value: string): number {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    throw new Error(speedValidationMessage());
  }

  const speedMs = Number(trimmedValue);

  if (
    !Number.isSafeInteger(speedMs) ||
    speedMs < minSpeedMs ||
    speedMs > maxSpeedMs
  ) {
    throw new Error(speedValidationMessage());
  }

  return speedMs;
}

function speedValidationMessage(): string {
  return `Speed must be a whole number from ${minSpeedMs} to ${maxSpeedMs} ms. Lower is faster.`;
}
