import { showHUD } from "@raycast/api";
import { ensureInstalled, SESSION, timeRemaining } from "./lib/amphetamine";

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export default async function ShowStatus() {
  if (!(await ensureInstalled())) return;

  let remaining: number;
  try {
    remaining = await timeRemaining();
  } catch {
    await showHUD("Couldn't read status. Check Amphetamine automation permission.");
    return;
  }

  switch (remaining) {
    case SESSION.NONE:
      await showHUD("No active session");
      break;
    case SESSION.INFINITE:
      await showHUD("Active: Infinite");
      break;
    case SESSION.TRIGGER:
      await showHUD("Active: Trigger session");
      break;
    case SESSION.APP_OR_DATE:
      await showHUD("Active: until app quits or set time");
      break;
    default:
      await showHUD(`Active: ${formatSeconds(remaining)} left`);
  }
}
