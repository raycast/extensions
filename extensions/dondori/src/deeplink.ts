import { closeMainWindow, open } from "@raycast/api";
import type { OpenTarget } from "./client";

export function openDeepLink(target: OpenTarget): Promise<void> {
  return open(`dondori://open/${target}`);
}

export function quickAddDeepLink(text: string): Promise<void> {
  return open(`dondori://quick-add?text=${encodeURIComponent(text)}`);
}

/** Deep-link works even when the socket is down (app launches on demand). */
export async function runOpenCommand(target: OpenTarget): Promise<void> {
  await openDeepLink(target);
  await closeMainWindow();
}
