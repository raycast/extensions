import { open } from "@raycast/api";

/** Launches the Mac Performance Monitor app. */
export async function openApp(): Promise<void> {
  await open("/Applications/Mac Performance Monitor.app");
}
