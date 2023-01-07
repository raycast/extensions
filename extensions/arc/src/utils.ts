import { runAppleScript } from "run-applescript";
import { HistoryEntry } from "./types";

export function getDomain(url: string) {
  try {
    const urlObj = new URL(url);
    return {
      value: urlObj.hostname.replace("www.", ""),
      tooltip: url,
    };
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function getLastVisitedAt(entry: HistoryEntry) {
  const date = new Date(entry.lastVisitedAt);
  return { date, tooltip: `Last visited: ${date.toLocaleString()}` };
}

export async function openNewWindow() {
  await runAppleScript(`
    tell application "Arc"
      make new window
      activate
    end tell
  `);
}
