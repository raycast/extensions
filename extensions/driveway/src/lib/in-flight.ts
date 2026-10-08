import { LocalStorage } from "@raycast/api";
import { APPLESCRIPT_MOUNT_TIMEOUT_MS } from "./mount";

const KEY = "mounts-in-flight";

// Mounts that were started but not waited for. The menu bar can't wait: Raycast
// unloads the command seconds after its menu closes, while `mount volume` sits
// there for as long as macOS shows a password or certificate dialog. Recording
// the drive stops anything from starting a second mount of it meanwhile, which
// macOS does not treat as a no-op: it attaches another copy of the same share
// at "/Volumes/<name>-1".
//
// A record lasts only as long as the AppleScript itself can, so a mount whose
// dialog was dismissed, or that failed out of sight, can be retried rather than
// blocking the drive for good.
type InFlight = Record<string, number>;

async function read(): Promise<InFlight> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as InFlight) : {};
  } catch {
    return {};
  }
}

// Expired records are dropped on the way out, so nothing has to prune them.
export async function mountsInFlight(): Promise<Set<string>> {
  const records = await read();
  const live = Object.entries(records).filter(([, startedAt]) => Date.now() - startedAt < APPLESCRIPT_MOUNT_TIMEOUT_MS);

  if (live.length !== Object.keys(records).length) {
    await LocalStorage.setItem(KEY, JSON.stringify(Object.fromEntries(live)));
  }

  return new Set(live.map(([id]) => id));
}

export async function markMountInFlight(id: string): Promise<void> {
  const records = await read();
  records[id] = Date.now();
  await LocalStorage.setItem(KEY, JSON.stringify(records));
}

export async function clearMountInFlight(id: string): Promise<void> {
  const records = await read();
  if (!(id in records)) return;

  delete records[id];
  await LocalStorage.setItem(KEY, JSON.stringify(records));
}
