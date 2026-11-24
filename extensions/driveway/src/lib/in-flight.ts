import { LocalStorage } from "@raycast/api";
import { APPLESCRIPT_MOUNT_TIMEOUT_MS } from "./mount";

// Mounts that were started but not waited for. The menu bar can't wait: Raycast
// unloads the command seconds after its menu closes, while `mount volume` sits
// there for as long as macOS shows a password or certificate dialog. Recording
// the drive stops anything from starting a second mount of it meanwhile, which
// macOS does not treat as a no-op: it attaches another copy of the same share
// at "/Volumes/<name>-1".
//
// One key per drive, rather than one record holding them all. These are written
// by whichever command happens to be running — the menu bar, Mount All,
// Auto-Reconnect — and a shared record would mean reading it, changing one
// entry and writing the whole thing back. Two of those overlapping would drop
// each other's change, and the change being dropped is what stops a drive from
// being mounted twice. A write here only ever touches the one drive it is about.
const PREFIX = "mount-in-flight:";

// A record lasts only as long as the AppleScript itself can, so a mount whose
// dialog was dismissed, or that failed out of sight, can be retried rather than
// blocking the drive for good. Expired keys are dropped on the way past.
export async function mountsInFlight(): Promise<Set<string>> {
  const items = await LocalStorage.allItems<Record<string, string>>();
  const live = new Set<string>();

  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PREFIX)) continue;

    const startedAt = Number(value);
    if (Number.isFinite(startedAt) && Date.now() - startedAt < APPLESCRIPT_MOUNT_TIMEOUT_MS) {
      live.add(key.slice(PREFIX.length));
    } else {
      await LocalStorage.removeItem(key);
    }
  }

  return live;
}

export async function markMountInFlight(id: string): Promise<void> {
  await LocalStorage.setItem(PREFIX + id, String(Date.now()));
}

export async function clearMountInFlight(id: string): Promise<void> {
  await LocalStorage.removeItem(PREFIX + id);
}
