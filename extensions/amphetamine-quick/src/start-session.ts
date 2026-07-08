import { getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { ensureInstalled, startSession } from "./lib/amphetamine";

/** Parse a duration box: empty means 0, anything that isn't a whole number is invalid (null). */
function parseBox(value: string | undefined): number | null {
  const s = (value ?? "").trim();
  if (s === "") return 0;
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default async function StartSession(props: LaunchProps<{ arguments: Arguments.StartSession }>) {
  if (!(await ensureInstalled())) return;

  const { hours, minutes, seconds } = props.arguments;
  const h = parseBox(hours);
  const m = parseBox(minutes);
  const s = parseBox(seconds);
  if (h === null || m === null || s === null) {
    await showHUD("Enter whole numbers only, or leave the boxes empty for no time limit.");
    return;
  }

  const totalSeconds = h * 3600 + m * 60 + s;

  // Amphetamine's granularity is whole minutes; round any leftover seconds up.
  const mins = totalSeconds === 0 ? 0 : Math.ceil(totalSeconds / 60);

  const { displaySleepAllowed } = getPreferenceValues<Preferences.StartSession>();

  try {
    await startSession(mins, displaySleepAllowed);
  } catch {
    await showHUD("Couldn't start session. Check Amphetamine automation permission.");
    return;
  }

  if (mins === 0) {
    await showHUD("Amphetamine on: no time limit");
  } else {
    const rounded = totalSeconds % 60 !== 0 ? ` (rounded to ${formatMinutes(mins)})` : "";
    await showHUD(`Amphetamine on: ${formatMinutes(mins)}${rounded}`);
  }
}
