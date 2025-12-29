import { Clipboard, getPreferenceValues } from "@raycast/api";
import { add } from "./clipboard";

interface Preferences {
  maxItems: string;
  pollInterval: string;
}

let last = "";
let intervalId: NodeJS.Timeout | null = null;

function getPollInterval(): number {
  const prefs = getPreferenceValues<Preferences>();
  return Number(prefs.pollInterval) || 500;
}

export function start() {
  if (intervalId) return; // already running

  const pollMs = getPollInterval();
  intervalId = setInterval(async () => {
    const text = await Clipboard.readText();
    if (text && text !== last) {
      last = text;
      add(text);
    }
  }, pollMs);
}

export function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
