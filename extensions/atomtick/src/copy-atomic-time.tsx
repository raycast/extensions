import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { ensureSynced, getAtomicNow } from "./lib/ntp";
import { getZonedTimeParts } from "./lib/timezone";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDigital(atomicMs: number): string {
  const { hours, minutes, seconds } = getZonedTimeParts(atomicMs);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default async function Command() {
  let synced = true;
  try {
    await ensureSynced();
  } catch (err) {
    synced = false;
    const message = err instanceof Error ? err.message : String(err);
    await showToast({ style: Toast.Style.Failure, title: "NTP sync failed", message });
  }

  const atomicMs = getAtomicNow();
  const iso = new Date(atomicMs).toISOString();
  const digital = formatDigital(atomicMs);

  await Clipboard.copy(iso);
  await closeMainWindow();
  await showHUD(synced ? `Copied ${digital} (${iso})` : `Copied system time ${digital} (${iso})`);
}
