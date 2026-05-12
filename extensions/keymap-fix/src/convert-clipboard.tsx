import {
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  Direction,
  convert,
  detectDirection,
  directionLabel,
} from "./lib/layouts";

interface Prefs {
  defaultDirection: Direction | "auto";
  azerty: boolean;
  toast: boolean;
}

export default async function main() {
  const prefs = getPreferenceValues<Prefs>();
  const text = await Clipboard.readText();

  if (!text || text.trim().length === 0) {
    await showHUD("Clipboard is empty");
    return;
  }

  const direction: Direction =
    prefs.defaultDirection === "auto"
      ? detectDirection(text, prefs.azerty)
      : prefs.defaultDirection;

  const converted = convert(text, direction);
  await Clipboard.copy(converted);

  if (prefs.toast) {
    await showToast({
      style: Toast.Style.Success,
      title: `Converted ${directionLabel(direction)}`,
      message: truncate(converted, 60),
    });
  } else {
    await showHUD(`Converted ${directionLabel(direction)}`);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
