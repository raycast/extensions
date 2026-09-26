import { open } from "@raycast/api";
import { recentApps } from "swift:../../swift";

export interface RunningApp {
  bundleId: string;
  name: string;
  path: string;
}

/** Bundle IDs never treated as history entries. Raycast itself is frontmost while its window is open. */
const IGNORED = new Set(["com.raycast.macos"]);

/**
 * Regular (Dock) apps, most recently used first, across all Spaces.
 * Implemented natively in `swift/Sources/JumperNative/RecentApps.swift` (~7ms per call; ADR-001, ADR-008 in https://github.com/mattherwig/jumper/blob/main/docs/DECISIONS.md).
 */
export async function getRecentApps(): Promise<RunningApp[]> {
  const apps: RunningApp[] = await recentApps();
  return apps.filter((a) => !IGNORED.has(a.bundleId));
}

/**
 * Bring an app to the front by asking Raycast (already running, allowed to activate apps) to open its bundle.
 * Avoids spawning `open -b` (~60ms). `NSRunningApplication.activate` from a background process is ignored on
 * macOS 14+, see ADR-002 in https://github.com/mattherwig/jumper/blob/main/docs/DECISIONS.md. Like a Dock click, it also unhides the app.
 */
export async function activateApp(app: RunningApp): Promise<void> {
  await open(app.path);
}
