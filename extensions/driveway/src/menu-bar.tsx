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
import { errorText } from "./lib/errors";
import { MENU_BAR_CACHE_KEY } from "./lib/menu-bar-cache";
import { clearMountInFlight, markMountInFlight, mountsInFlight } from "./lib/in-flight";
import { findMountedShare, isReachable, listMountedShares, mountShare, unmountShare, MountLocation } from "./lib/mount";

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

// A HUD is the only feedback a menu bar command can show. Raycast launches an
// item's callback in the background, where the Toast API refuses to run at all
// ("Toast API is not available when command is launched in background") and
// throws, which lands on the menu bar as an error icon. A HUD takes no style
// either, so the outcome is carried by a marker at the front. Nothing here is
// allowed to throw: feedback is never worth breaking the menu bar over.
async function say(text: string): Promise<void> {
  try {
    await showHUD(text);
  } catch (error) {
    console.error(error);
  }
}

function reportSuccess(text: string): Promise<void> {
  return say(`✅ ${text}`);
}

function reportFailure(text: string, error: unknown, fallback: string): Promise<void> {
  return say(`❌ ${text}: ${errorText(error, fallback)}`);
}

// No saved entry means no alias, so name an unsaved mount after its share,
// falling back to the volume it landed on.
function shareLabel(share: MountLocation): string {
  const segments = share.path.split("/").filter(Boolean);
  return segments[segments.length - 1] || share.mountPoint.split("/").filter(Boolean).pop() || share.host;
}

async function readCache(): Promise<Cache | null> {
  const raw = await LocalStorage.getItem<string>(MENU_BAR_CACHE_KEY);
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
  // Mounts a previous click started and couldn't wait for. Read fresh every
  // run, cached snapshot or not, since it is the one thing that changes while
  // this command isn't running.
  const [inFlight, setInFlight] = useState<Set<string>>(new Set());

  // A real fetch shells out to mount and df, so the result is cached and
  // reused until the chosen interval has elapsed.
  async function load() {
    setIsLoading(true);
    const [entries, mountedShares, pending] = await Promise.all([getServers(), listMountedShares(), mountsInFlight()]);

    // A drive that has landed is no longer in flight, however it got there.
    for (const id of [...pending]) {
      const entry = entries.find((server) => server.id === id);
      if (entry && findMountedShare(mountedShares, entry)) {
        await clearMountInFlight(id);
        pending.delete(id);
      }
    }

    setServers(entries);
    setMounted(mountedShares);
    setInFlight(pending);
    setIsLoading(false);

    // A snapshot taken while a mount is still going would go stale the moment
    // the volume lands: the next open would pair a drive that reads as
    // disconnected with an in-flight record that outlives it, and show "Still
    // connecting" for something already mounted. Leave no snapshot instead.
    if (pending.size) {
      await LocalStorage.removeItem(MENU_BAR_CACHE_KEY);
      return;
    }

    const cache: Cache = { servers: entries, mounted: mountedShares, timestamp: Date.now() };
    await LocalStorage.setItem(MENU_BAR_CACHE_KEY, JSON.stringify(cache));
  }

  // Both the Refresh item and the tail of every action land here.
  async function refresh() {
    try {
      await load();
    } catch (error) {
      setIsLoading(false);
      await reportFailure("Couldn't refresh drive status", error, "Reading the mount list failed.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { pref_menu_bar_refresh_interval: intervalPref } = getPreferenceValues<Preferences.MenuBar>();
        const intervalMinutes = parseInt(intervalPref, 10);

        const cache = await readCache();
        // Anything in flight means the snapshot can't be trusted, whoever
        // wrote it: `mount` has to be read for real to tell whether the drive
        // has landed since.
        const pending = await mountsInFlight();

        if (cache && pending.size === 0) {
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
  // Network drives that are mounted but aren't in the saved list: a one-off
  // from Browse Shares, or anything connected in Finder. The count in the menu
  // bar deliberately ignores them, so it doesn't jump around for mounts this
  // extension doesn't keep, but hiding them entirely made the menu look like a
  // picture of what is mounted when it wasn't.
  const unsavedMounts = mounted.filter((share) => !savedDrives.some((server) => findMountedShare([share], server)));

  async function handleToggle(server: ServerEntry) {
    setBusyId(server.id);
    const label = server.alias || server.host;
    let stillRunning = false;

    // Work still running at the deadline gets no second message: Raycast has
    // unloaded this command by then, so there is nothing left to show a HUD.
    // The refresh below, and the next one, are what report where it got to.
    try {
      if (findMountedShare(mounted, server)) {
        const result = await within(settle(unmountShare(server)));
        if (!result) {
          stillRunning = true;
          await say(`⏳ Disconnecting ${label}…`);
        } else if (result.ok) {
          await reportSuccess(`Disconnected ${label}`);
        } else {
          await reportFailure(`Couldn't disconnect ${label}`, result.error, "Unmounting failed.");
        }
      } else {
        const share = buildShare(server);
        // Checked here rather than through connectShare so an offline server
        // is reported as such well inside the budget, instead of racing it.
        if (!(await isReachable(share.host, share.protocol))) {
          await say(`⚠️ ${label} is unreachable`);
        } else {
          const outcome = await watchForMount(settle(mountShare(share)), server);
          if (outcome.kind === "mounted") {
            await clearMountInFlight(server.id);
            await reportSuccess(`Connected to ${label}`);
          } else if (outcome.kind === "failed") {
            await clearMountInFlight(server.id);
            await reportFailure(`Couldn't connect to ${label}`, outcome.error, "Mounting failed.");
          } else {
            stillRunning = true;
            // Still going, most likely behind a macOS dialog. Remember it, so
            // the next click doesn't mount the same share a second time.
            await markMountInFlight(server.id);
            await say(`⏳ Connecting to ${label}…`);
          }
        }
      }
    } catch (error) {
      // buildShare rejects a malformed saved entry; nothing was attempted.
      await reportFailure(`Couldn't connect to ${label}`, error, "The saved entry is invalid.");
    }

    setBusyId(null);
    // Re-reads `mount`, so the title and the checkmarks now reflect what just
    // happened instead of waiting out the refresh interval.
    await refresh();

    if (stillRunning) {
      // The snapshot just written says "not connected" for something that is
      // still being mounted, so don't let the next menu open trust it.
      await LocalStorage.removeItem(MENU_BAR_CACHE_KEY).catch(() => undefined);
    }
  }

  async function handleUnmountUnsaved(share: MountLocation) {
    const label = shareLabel(share);
    setBusyId(share.mountPoint);

    try {
      const result = await within(settle(unmountShare({ host: share.host, path: share.path, protocol: share.family })));
      if (!result) {
        await say(`⏳ Disconnecting ${label}…`);
      } else if (result.ok) {
        await reportSuccess(`Disconnected ${label}`);
      } else {
        await reportFailure(`Couldn't disconnect ${label}`, result.error, "Unmounting failed.");
      }
    } catch (error) {
      await reportFailure(`Couldn't disconnect ${label}`, error, "Unmounting failed.");
    }

    setBusyId(null);
    await refresh();
  }

  async function openCommand(name: string, title: string) {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (error) {
      await reportFailure(`Couldn't open ${title}`, error, "The command may be disabled in Preferences.");
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
          // Started earlier and not finished: say so rather than offering a
          // click that would mount the same share twice.
          const connecting = !match && inFlight.has(server.id);

          return (
            <MenuBarExtra.Item
              key={server.id}
              title={busyId === server.id ? `${label}…` : label}
              subtitle={match ? "Connected, click to unmount" : connecting ? "Still connecting" : "Click to connect"}
              icon={
                match
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : connecting
                    ? { source: Icon.Clock, tintColor: Color.SecondaryText }
                    : Icon.Circle
              }
              onAction={
                connecting
                  ? () => say(`⏳ ${label} is still connecting. Answer any macOS prompt, or wait.`)
                  : () => handleToggle(server)
              }
            />
          );
        })}
      </MenuBarExtra.Section>
      {unsavedMounts.length > 0 && (
        <MenuBarExtra.Section title="Mounted but Not Saved">
          {unsavedMounts.map((share) => {
            const label = shareLabel(share);
            return (
              <MenuBarExtra.Item
                key={share.mountPoint}
                title={busyId === share.mountPoint ? `${label}…` : label}
                subtitle={`${share.host}, click to unmount`}
                icon={{ source: Icon.HardDrive, tintColor: Color.SecondaryText }}
                onAction={() => handleUnmountUnsaved(share)}
              />
            );
          })}
        </MenuBarExtra.Section>
      )}
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
