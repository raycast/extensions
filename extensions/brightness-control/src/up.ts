import { showHUD } from "@raycast/api";
import { adjustBrightness } from "./utils/platform";

export default async () => {
  const result = await adjustBrightness(10);
  if (!result) return;

  await showHUD(formatBrightnessHUD(result, "Brightness increased"));
};

function formatBrightnessHUD(result: { displayName?: string; brightness?: number }, fallback: string): string {
  if (result.displayName && result.brightness != null) {
    return `${result.displayName}: ${result.brightness}%`;
  }

  return fallback;
}
