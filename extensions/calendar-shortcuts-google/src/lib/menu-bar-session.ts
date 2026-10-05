import { Cache, LaunchType, launchCommand } from "@raycast/api";
import { randomUUID } from "node:crypto";

const sessionCache = new Cache({ namespace: "daycal-menu-bar-session" });
const eventCache = new Cache({ namespace: "calendar-shortcuts-menu-bar" });

export function menuBarSessionRevision(): string {
  return sessionCache.get("revision") ?? "initial";
}

export function subscribeMenuBarSession(onChange: () => void): () => void {
  return sessionCache.subscribe(onChange);
}

export async function invalidateMenuBarSession(): Promise<void> {
  // Invalidate pending workers before clearing snapshots: an old Google request
  // must never repopulate the cache after disconnect.
  sessionCache.set("revision", randomUUID());
  eventCache.clear();
  // A separate command's React state is not cleared by Cache.clear(). Launch a
  // new unauthenticated render immediately, including when already signed out.
  await launchCommand({
    name: "menu-bar",
    type: LaunchType.Background,
    context: { refreshMode: "full", sessionRevision: menuBarSessionRevision() },
  });
}
