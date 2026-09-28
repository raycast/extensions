import { List, Icon, ActionPanel, Action, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { ServerEntry } from "./lib/share";
import { unmountShare } from "./lib/mount";
import { getServers } from "./lib/storage";
import { useMountStatus } from "./hooks/useMountStatus";
import { useNetworkDiscovery } from "./hooks/useNetworkDiscovery";
import { DiscoveredDriveItem, DiscoveredHostItem } from "./components/DiscoveredDrive";

export default function Command() {
  const [servers, setServers] = useState<ServerEntry[] | null>(null);
  const { mounted, volumes, refreshMounted, pollUntilMounted } = useMountStatus();
  const {
    smbShares,
    webdavHosts,
    otherDevices,
    isLoading: discoveryLoading,
    refresh: refreshDiscovery,
  } = useNetworkDiscovery();

  async function load() {
    const [entries, mountedShares] = await Promise.all([getServers(), refreshMounted()]);
    setServers(entries);
    return mountedShares;
  }

  useEffect(() => {
    load();
  }, []);

  const savedKeys = new Set(
    (servers ?? []).filter((s) => s.path?.trim()).map((s) => `${s.host.toLowerCase()}/${(s.path ?? "").toLowerCase()}`),
  );

  const smbByHost = new Map<string, string[]>();
  for (const { host, vol } of smbShares) {
    if (savedKeys.has(`${host.toLowerCase()}/${vol.toLowerCase()}`)) continue;
    const existing = smbByHost.get(host) ?? [];
    existing.push(vol);
    smbByHost.set(host, existing);
  }

  const webdavNotSaved = webdavHosts.filter((h) => {
    // Host-level only, so "saved" means any entry for this host and protocol.
    return !(servers ?? []).some(
      (s) => s.host.toLowerCase() === h.host.toLowerCase() && (s.protocol ?? "smb") === h.protocol,
    );
  });

  // Drop ping-only hosts already listed with a known protocol, or saved.
  const protocolKnownHosts = new Set(
    [...smbByHost.keys(), ...webdavHosts.map((h) => h.host)].map((h) => h.toLowerCase()),
  );
  const otherDevicesNotSaved = otherDevices.filter(
    (host) =>
      !protocolKnownHosts.has(host.toLowerCase()) &&
      !(servers ?? []).some((s) => s.host.toLowerCase() === host.toLowerCase()),
  );

  async function unmountAllOnHost(host: string) {
    const hostMounted = mounted.filter((m) => m.host.toLowerCase() === host.toLowerCase());
    if (!hostMounted.length) return;
    await Promise.all(hostMounted.map((m) => unmountShare({ host: m.host, path: m.path }).catch(() => undefined)));
    await refreshMounted();
  }

  const isLoading = servers === null || discoveryLoading;
  const nothingFound =
    !isLoading && smbByHost.size === 0 && webdavNotSaved.length === 0 && otherDevicesNotSaved.length === 0;

  return (
    <List isLoading={isLoading} navigationTitle="Discover Devices">
      {nothingFound && (
        <List.EmptyView
          title="No Devices Found"
          description="Nothing discovered yet — check Network Discovery in Preferences, or a server may need a moment to respond."
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refreshDiscovery}
              />
            </ActionPanel>
          }
        />
      )}
      {[...smbByHost.entries()].map(([host, vols]) => (
        <List.Section key={host} title={`SMB on ${host}`}>
          {vols.map((vol) => (
            <DiscoveredDriveItem
              key={vol}
              vol={vol}
              host={host}
              volumes={volumes}
              mounted={mounted}
              onChanged={refreshMounted}
              onMountRequested={pollUntilMounted}
              onUnmountAll={() => unmountAllOnHost(host)}
              onServerAdded={load}
              onRefresh={refreshDiscovery}
            />
          ))}
        </List.Section>
      ))}
      {webdavNotSaved.length > 0 && (
        <List.Section title="WebDAV">
          {webdavNotSaved.map((h) => (
            <DiscoveredHostItem
              key={`${h.host}-${h.protocol}`}
              host={h.host}
              protocol={h.protocol}
              onServerAdded={load}
              onRefresh={refreshDiscovery}
            />
          ))}
        </List.Section>
      )}
      {otherDevicesNotSaved.length > 0 && (
        <List.Section title="Other Devices on Network">
          {otherDevicesNotSaved.map((host) => (
            <DiscoveredHostItem key={host} host={host} onServerAdded={load} onRefresh={refreshDiscovery} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
