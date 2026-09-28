import { getPreferenceValues } from "@raycast/api";
import { adjustBrightness } from "./utils/platform";
import { showBrightnessFeedback } from "./utils/feedback";

export default async () => {
  const { closeRaycast = true, showDisplayName = true, step = "10" } = getPreferenceValues<Preferences.Down>();
  const amount = parseStep(step);
  const result = await adjustBrightness(-amount);
  if (!result) return;

  const message =
    result.displayName && result.brightness != null
      ? showDisplayName
        ? `${result.displayName}: ${result.brightness}%`
        : `Brightness set to ${result.brightness}%`
      : "Brightness increased";
  await showBrightnessFeedback(message, closeRaycast);
};

function parseStep(step: string): number {
  const amount = Number.parseInt(step, 10);
  return Number.isInteger(amount) && amount > 0 ? amount : 10;
}
