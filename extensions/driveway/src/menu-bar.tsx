import {
  MenuBarExtra,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  Keyboard,
  LocalStorage,
  getPreferenceValues,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getServers } from "./lib/storage";
import { buildShare, ServerEntry } from "./lib/share";
import { delay } from "./lib/throttle";
import { findMountedShare, isReachable, listMountedShares, mountShare, unmountShare, MountLocation } from "./lib/mount";

const CACHE_KEY = "menu-bar-cache";

// Raycast unloads a menu bar command as soon as its menu closes, and clicking
// an item closes the menu. An action still awaiting something by then is cut
// off mid-flight, and Raycast replaces the menu bar icon with an error icon
// that opens the main window on a crash report. Mounting can easily outlast
// that window — a password or certificate dialog alone can sit for a minute —
// so an action reports whatever outcome arrives inside this budget as a HUD
// and leaves the rest to finish on its own. Nothing here may reject.
const ACTION_BUDGET_MS = 3_000;

// How often `mount` is re-read while waiting for a share to appear. Cheap
// enough to keep the count honest the moment the volume lands.
const POLL_INTERVAL_MS = 250;

type Cache = { servers: ServerEntry[]; mounted: MountLocation[]; timestamp: number };

type Settled = { ok: true } | { ok: false; error: unknown };

// Neither this nor the two waits below may reject: a rejection landing after
// the command was unloaded is unhandled, which is the same error icon by
// another route.
function settle(work: Promise<void>): Promise<Settled> {
  return work.then<Settled, Settled>(
    () => ({ ok: true }),
    (error: unknown) => ({ ok: false, error }),
  );
}

// Resolves to null when the work is still running once the budget is up.
function within(work: Promise<Settled>): Promise<Settled | null> {
  let timer: NodeJS.Timeout;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ACTION_BUDGET_MS);
  });
  return Promise.race([work, budget]).finally(() => clearTimeout(timer));
}

type MountOutcome = { kind: "mounted" } | { kind: "failed"; error: unknown } | { kind: "pending" };

// Watches `mount` for the share to show up rather than only waiting on the
// AppleScript to return, so the menu bar count ticks up the instant the
// volume is really there — no waiting for the next refresh interval.
async function watchForMount(attempt: Promise<Settled>, server: ServerEntry): Promise<MountOutcome> {
  const deadline = Date.now() + ACTION_BUDGET_MS;
  const attempted: { result: Settled | null } = { result: null };
  attempt.then((settled) => (attempted.result = settled));

  for (;;) {
    const mountedShares = await listMountedShares().catch(() => null);
    if (mountedShares && findMountedShare(mountedShares, server)) return { kind: "mounted" };

    // `mount volume` only returns once the volume is up, so trust it even if
    // this entry doesn't match what landed.
    const result = attempted.result;
    if (result) return result.ok ? { kind: "mounted" } : { kind: "failed", error: result.error };
    if (Date.now() >= deadline) return { kind: "pending" };

    await delay(POLL_INTERVAL_MS);
  }
}

function describe(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message.replace(/\s+/g, " ") : fallback;
}

async function readCache(): Promise<Cache | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Cache;
  } catch {
    // A snapshot written by an older version, or a truncated one.
    return null;
  }
}

export default function Command() {
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [mounted, setMounted] = useState<MountLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // A real fetch shells out to mount and df, so the result is cached and
  // reused until the chosen interval has elapsed.
  async function load() {
    setIsLoading(true);
    const [entries, mountedShares] = await Promise.all([getServers(), listMountedShares()]);
    setServers(entries);
    setMounted(mountedShares);
    setIsLoading(false);
    const cache: Cache = { servers: entries, mounted: mountedShares, timestamp: Date.now() };
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }

  // Both the Refresh item and the tail of every action land here.
  async function refresh() {
    try {
      await load();
    } catch (error) {
      setIsLoading(false);
      await showHUD(describe(error, "Couldn't refresh drive status"));
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { pref_menu_bar_refresh_interval: intervalPref } = getPreferenceValues<Preferences.MenuBar>();
        const intervalMinutes = parseInt(intervalPref, 10);

        const cache = await readCache();

        if (cache) {
          const elapsedMinutes = (Date.now() - cache.timestamp) / 60_000;
          if (elapsedMinutes < intervalMinutes) {
            // Not due yet; show the cached snapshot instantly.
            setServers(cache.servers);
            setMounted(cache.mounted);
            setIsLoading(false);
            return;
          }
        }

        // First run or genuinely due: real fetch.
        await load();
      } catch (error) {
        // A background refresh that fails stays quiet: the snapshot is just
        // stale until the next tick, which is no reason to swap the menu bar
        // icon for an error icon.
        console.error(error);
        setIsLoading(false);
      }
    })();
  }, []);

  const savedDrives = servers.filter((server) => server.path?.trim());
  const connectedCount = savedDrives.filter((server) => findMountedShare(mounted, server)).length;

  async function handleToggle(server: ServerEntry) {
    setBusyId(server.id);
    const label = server.alias || server.host;
    let stillRunning = false;

    try {
      if (findMountedShare(mounted, server)) {
        const result = await within(settle(unmountShare(server)));
        if (!result) {
          stillRunning = true;
          await showHUD(`Disconnecting ${label}…`);
        } else if (result.ok) {
          await showHUD(`Disconnected ${label}`);
        } else {
          await showHUD(describe(result.error, `Couldn't disconnect ${label}`));
        }
      } else {
        const share = buildShare(server);
        // Checked here rather than through connectShare so an offline server
        // is reported as such well inside the budget, instead of racing it.
        if (!(await isReachable(share.host, share.protocol))) {
          await showHUD(`${label} is unreachable`);
        } else {
          const outcome = await watchForMount(settle(mountShare(share)), server);
          if (outcome.kind === "mounted") {
            await showHUD(`Connected to ${label}`);
          } else if (outcome.kind === "failed") {
            await showHUD(describe(outcome.error, `Couldn't connect to ${label}`));
          } else {
            stillRunning = true;
            await showHUD(`Connecting to ${label}…`);
          }
        }
      }
    } catch (error) {
      // buildShare rejects a malformed saved entry; nothing was attempted.
      await showHUD(describe(error, `Couldn't connect to ${label}`));
    }

    setBusyId(null);
    // Re-reads `mount`, so the title and the checkmarks now reflect what just
    // happened instead of waiting out the refresh interval.
    await refresh();

    if (stillRunning) {
      // The snapshot just written says "not connected" for something that is
      // still being mounted, so don't let the next menu open trust it.
      await LocalStorage.removeItem(CACHE_KEY).catch(() => undefined);
    }
  }

  async function openCommand(name: string, title: string) {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (error) {
      await showHUD(describe(error, `Couldn't open ${title}`));
    }
  }

  return (
    <MenuBarExtra
      icon={Icon.HardDrive}
      title={connectedCount > 0 ? String(connectedCount) : undefined}
      isLoading={isLoading}
      tooltip="DriveWay"
    >
      <MenuBarExtra.Section title="Saved Drives">
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
        {savedDrives.length === 0 && <MenuBarExtra.Item title="No saved drives" />}
        {savedDrives.map((server) => {
          const match = findMountedShare(mounted, server);
          const label = server.alias || server.host;
          return (
            <MenuBarExtra.Item
              key={server.id}
              title={busyId === server.id ? `${label}…` : label}
              subtitle={match ? "Connected, click to unmount" : "Click to connect"}
              icon={match ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
              onAction={() => handleToggle(server)}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Manage Drives…"
          icon={Icon.HardDrive}
          onAction={() => openCommand("index", "Manage Drives")}
        />
        <MenuBarExtra.Item
          title="Add Drive…"
          icon={Icon.Plus}
          onAction={() => openCommand("add-server", "Add Drive")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
