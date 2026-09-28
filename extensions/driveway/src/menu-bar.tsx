import {
  MenuBarExtra,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  Keyboard,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getServers } from "./lib/storage";
import { buildShare, ServerEntry } from "./lib/share";
import { connectShare, findMountedShare, listMountedShares, unmountShare, MountLocation } from "./lib/mount";

const CACHE_KEY = "menu-bar-cache";

type Cache = { servers: ServerEntry[]; mounted: MountLocation[]; timestamp: number };

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

  useEffect(() => {
    (async () => {
      const { pref_menu_bar_refresh_interval: intervalPref } = getPreferenceValues<Preferences.MenuBar>();
      const intervalMinutes = parseInt(intervalPref, 10);

      const raw = await LocalStorage.getItem<string>(CACHE_KEY);
      const cache: Cache | null = raw ? JSON.parse(raw) : null;

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
    })();
  }, []);

  const savedDrives = servers.filter((server) => server.path?.trim());
  const connectedCount = savedDrives.filter((server) => findMountedShare(mounted, server)).length;

  async function handleToggle(server: ServerEntry) {
    setBusyId(server.id);
    try {
      const match = findMountedShare(mounted, server);
      if (match) {
        await unmountShare(server);
      } else {
        const share = buildShare(server);
        await connectShare(share);
      }
    } catch {
      // No toast surface here; status just stays as-is until the next refresh.
    }
    setBusyId(null);
    await load();
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
          onAction={load}
        />
        {savedDrives.length === 0 && <MenuBarExtra.Item title="No saved drives" />}
        {savedDrives.map((server) => {
          const match = findMountedShare(mounted, server);
          const label = server.alias || server.host;
          return (
            <MenuBarExtra.Item
              key={server.id}
              title={busyId === server.id ? `${label}…` : label}
              subtitle={match ? "Connected — click to unmount" : "Click to connect"}
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
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Add Drive…"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "add-server", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
