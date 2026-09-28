import {
  ActionPanel,
  Action,
  Alert,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  confirmAlert,
  useNavigation,
  Keyboard,
  LaunchProps,
} from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { ServerForm, ServerFormInput } from "./components/ServerForm";
import { buildShare, PROTOCOL_LABELS, ServerEntry } from "./lib/share";
import { findMountedShare, unmountShare, UnreachableError, connectShare } from "./lib/mount";
import { getServers, removeServer, setAutoMount, updateServer } from "./lib/storage";
import { useMountStatus } from "./hooks/useMountStatus";
import { useNetworkDiscovery } from "./hooks/useNetworkDiscovery";
import {
  AddServer,
  COMPUTER_ICON,
  DiscoveredDriveItem,
  DiscoveredHostItem,
  diskUsageAccessories,
  savedDriveIcon,
} from "./components/DiscoveredDrive";
import { BrowseHostShares } from "./components/BrowseHostShares";

function EditServer({
  server,
  onSaved,
  onDuplicate,
}: {
  server: ServerEntry;
  onSaved: () => void;
  onDuplicate: (existingId: string) => void;
}) {
  const { pop } = useNavigation();

  async function handleSave(values: ServerFormInput) {
    await updateServer(server.id, values);
    await showToast({ style: Toast.Style.Success, title: "Server updated" });
    onSaved();
    pop();
  }

  return (
    <ServerForm
      submitTitle="Save Changes"
      initialValues={{ ...server, path: server.path ?? "" }}
      onSave={handleSave}
      onDuplicate={(existingId) => {
        onDuplicate(existingId);
        pop();
      }}
    />
  );
}

// selectId arrives from Add Drive when the drive was already saved: the form
// closes and lands here with the existing entry selected.
export default function Command(props: LaunchProps<{ launchContext: { selectId?: string } }>) {
  const [servers, setServers] = useState<ServerEntry[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(props.launchContext?.selectId);
  const { mounted, volumes, refreshMounted, pollUntilMounted } = useMountStatus();
  const {
    smbShares,
    smbHostsNeedingCredentials,
    webdavHosts,
    computers,
    otherDevices,
    isLoading: discoveryLoading,
    hasRun: discoveryHasRun,
    refresh: runDiscovery,
  } = useNetworkDiscovery({ auto: false });
  const { push } = useNavigation();

  async function load() {
    const [entries] = await Promise.all([getServers(), refreshMounted()]);
    setServers(entries);
  }

  useEffect(() => {
    load();
  }, []);

  async function unmountAllOnHost(host: string) {
    const hostMounted = mounted.filter((m) => m.host.toLowerCase() === host.toLowerCase());
    if (!hostMounted.length) return;
    await Promise.all(
      hostMounted.map((m) => unmountShare({ host: m.host, path: m.path, protocol: m.family }).catch(() => undefined)),
    );
    await refreshMounted();
  }

  async function handleRemove(server: ServerEntry) {
    const confirmed = await confirmAlert({
      title: `Remove ${server.alias || server.host}?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await removeServer(server.id);
    await showToast({ style: Toast.Style.Success, title: "Server removed" });
    await load();
  }

  async function handleToggleAutoMount(server: ServerEntry) {
    const next = !server.autoMount;
    await setAutoMount(server.id, next);
    await showToast({
      style: Toast.Style.Success,
      title: next ? "Auto-reconnect enabled" : "Auto-reconnect disabled",
      message: server.alias || server.host,
    });
    await load();
  }

  async function handleConnect(server: ServerEntry, options?: { open?: boolean }) {
    let share;
    try {
      share = buildShare(server);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid server",
        message: error instanceof Error ? error.message : "Check the saved host and path.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${share.label}…`,
    });

    try {
      await connectShare(share);
      toast.style = Toast.Style.Success;
      toast.title = `Mount requested for ${share.label}`;
      const connected = await pollUntilMounted(server);
      if (connected) {
        toast.title = `Connected to ${share.label}`;
        if (options?.open) {
          exec(`open "${connected.mountPoint}"`);
        }
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof UnreachableError) {
        toast.title = error.message;
      } else {
        toast.title = `Couldn't mount ${share.label}`;
        toast.message = error instanceof Error ? error.message.replace(/\s+/g, " ") : "open failed";
      }
    }
  }

  async function handleBrowse(server: ServerEntry) {
    const existing = findMountedShare(mounted, server);
    if (existing) {
      exec(`open "${existing.mountPoint}"`);
      return;
    }
    await handleConnect(server, { open: true });
  }

  async function handleUnmount(server: ServerEntry) {
    let share;
    try {
      share = buildShare(server);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid server",
        message: error instanceof Error ? error.message : "Check the saved host and path.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Unmounting ${share.label}…`,
    });

    try {
      await unmountShare(server);
      toast.style = Toast.Style.Success;
      toast.title = `Unmounted ${share.label}`;
      await load();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't unmount ${share.label}`;
      toast.message = error instanceof Error ? error.message.replace(/\s+/g, " ") : "unmount failed";
    }
  }

  const discoverAction = (
    <Action
      title={discoveryHasRun ? "Discover on Network Again" : "Discover on Network"}
      icon={Icon.Network}
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onAction={runDiscovery}
    />
  );

  const addServerAction = (
    <Action
      title="Add Drive"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => push(<AddServer onSaved={load} onDuplicate={setSelectedId} />)}
    />
  );

  const savedKeys = new Set(
    (servers ?? []).filter((s) => s.path?.trim()).map((s) => `${s.host.toLowerCase()}/${(s.path ?? "").toLowerCase()}`),
  );

  // All sources merge into one shape; only SMB hosts expand into shares.
  const smbByHost = new Map<string, string[]>();
  for (const { host, vol } of smbShares) {
    if (savedKeys.has(`${host.toLowerCase()}/${vol.toLowerCase()}`)) continue;
    const existing = smbByHost.get(host) ?? [];
    existing.push(vol);
    smbByHost.set(host, existing);
  }

  const webdavNotSaved = webdavHosts.filter(
    (h) =>
      !(servers ?? []).some(
        (s) => s.host.toLowerCase() === h.host.toLowerCase() && (s.protocol ?? "smb") === h.protocol,
      ),
  );

  // SMB hosts macOS holds no credential for. Listed at host level rather
  // than silently dropped, so they can be browsed with credentials on demand.
  const expandedHostKeys = new Set([...smbByHost.keys()].map((h) => h.toLowerCase()));
  const smbHostsToBrowse = smbHostsNeedingCredentials.filter(
    (host) =>
      !expandedHostKeys.has(host.toLowerCase()) &&
      !(servers ?? []).some((s) => s.host.toLowerCase() === host.toLowerCase() && (s.protocol ?? "smb") === "smb"),
  );

  const sharingHosts = new Set(
    [...smbByHost.keys(), ...smbHostsToBrowse, ...webdavHosts.map((h) => h.host)].map((h) => h.toLowerCase()),
  );

  // Machines that announced themselves but advertise no sharing service.
  // Finder lists these too; most still serve SMB once you open them.
  const computersNotKnown = computers.filter(
    (c) =>
      !sharingHosts.has(c.host.toLowerCase()) &&
      !(servers ?? []).some((s) => s.host.toLowerCase() === c.host.toLowerCase()),
  );

  // Drop ping-only hosts already listed with a known protocol, or saved.
  const protocolKnownHosts = new Set([...sharingHosts, ...computersNotKnown.map((c) => c.host.toLowerCase())]);
  const otherDevicesNotSaved = otherDevices.filter(
    (host) =>
      !protocolKnownHosts.has(host.toLowerCase()) &&
      !(servers ?? []).some((s) => s.host.toLowerCase() === host.toLowerCase()),
  );

  const hasDiscovered =
    smbByHost.size > 0 ||
    smbHostsToBrowse.length > 0 ||
    webdavNotSaved.length > 0 ||
    computersNotKnown.length > 0 ||
    otherDevicesNotSaved.length > 0;
  const isLoading = servers === null || discoveryLoading;
  const nothingToShow = (servers?.length ?? 0) === 0 && !hasDiscovered && !isLoading;

  return (
    <List
      isLoading={isLoading}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      actions={
        <ActionPanel>
          {addServerAction}
          {discoverAction}
        </ActionPanel>
      }
    >
      {nothingToShow && (
        <List.EmptyView
          title="No Drives"
          description="Run Add Drive to save one, or Discover on Network to see what's already reachable."
          icon={Icon.HardDrive}
          actions={
            <ActionPanel>
              {addServerAction}
              {discoverAction}
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Saved Drives">
        {(servers ?? []).map((server) => {
          const hasPath = Boolean(server.path?.trim());
          let label = server.alias || server.host;
          try {
            label = buildShare(server).label;
          } catch {
            // keep the fallback label above if the saved entry is no longer valid
          }

          const match = hasPath ? findMountedShare(mounted, server) : undefined;
          const connected = Boolean(match);
          const protocol = server.protocol ?? "smb";
          // Skip the username tag when the subtitle already shows it.
          const userAlreadyShown =
            server.user &&
            (server.host.toLowerCase().includes(server.user.toLowerCase()) ||
              (server.path ?? "").toLowerCase().includes(server.user.toLowerCase()));

          return (
            <List.Item
              key={server.id}
              id={server.id}
              title={label}
              subtitle={hasPath ? `${server.host}/${server.path}` : server.host}
              accessories={[
                ...(connected
                  ? [
                      {
                        tag: { value: "Connected", color: Color.Green },
                        icon: Icon.CheckCircle,
                      },
                    ]
                  : []),
                ...diskUsageAccessories(match?.mountPoint, volumes),
                // Only for non-SMB entries; SMB is the implied default.
                ...(protocol !== "smb" ? [{ tag: { value: PROTOCOL_LABELS[protocol] }, tooltip: "Protocol" }] : []),
                ...(server.autoMount ? [{ icon: Icon.ArrowClockwise, tooltip: "Auto-reconnect enabled" }] : []),
                ...(!hasPath ? [{ tag: { value: "No share selected", color: Color.SecondaryText } }] : []),
                ...(server.user && !userAlreadyShown
                  ? [{ icon: Icon.Person, text: server.user, tooltip: "Username" }]
                  : []),
              ]}
              icon={savedDriveIcon(server, connected)}
              actions={
                <ActionPanel>
                  {hasPath &&
                    (connected ? (
                      <Action
                        title="Unmount"
                        icon={Icon.Eject}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() => handleUnmount(server)}
                      />
                    ) : (
                      <Action title="Connect" icon={Icon.Plug} onAction={() => handleConnect(server, { open: true })} />
                    ))}
                  {hasPath && (
                    <Action
                      title="Browse"
                      icon={Icon.Finder}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() => handleBrowse(server)}
                    />
                  )}
                  {hasPath && (
                    <Action
                      title={server.autoMount ? "Disable Auto-Reconnect" : "Enable Auto-Reconnect"}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => handleToggleAutoMount(server)}
                    />
                  )}
                  {protocol === "smb" && (
                    <Action
                      title="Browse Shares on This Host…"
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      onAction={() =>
                        push(
                          <BrowseHostShares
                            server={server}
                            mounted={mounted}
                            volumes={volumes}
                            onMountRequested={pollUntilMounted}
                            onChanged={refreshMounted}
                            onServerAdded={load}
                          />,
                        )
                      }
                    />
                  )}
                  <Action
                    title="Edit Server"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => push(<EditServer server={server} onSaved={load} onDuplicate={setSelectedId} />)}
                  />
                  {addServerAction}
                  {discoverAction}
                  <Action
                    title="Remove Server"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleRemove(server)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {[...smbByHost.entries()].map(([host, vols]) => (
        <List.Section key={host} title={`Discovered on ${host}`}>
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
              onRefresh={runDiscovery}
            />
          ))}
        </List.Section>
      ))}
      {smbHostsToBrowse.length > 0 && (
        <List.Section title="Discovered SMB Servers">
          {smbHostsToBrowse.map((host) => (
            <DiscoveredHostItem
              key={host}
              host={host}
              protocol="smb"
              subtitle="SMB · sign in to browse"
              onServerAdded={load}
              onRefresh={runDiscovery}
              onBrowse={() =>
                push(
                  <BrowseHostShares
                    server={{ id: host, host, protocol: "smb" }}
                    mounted={mounted}
                    volumes={volumes}
                    onMountRequested={pollUntilMounted}
                    onChanged={refreshMounted}
                    onServerAdded={load}
                  />,
                )
              }
            />
          ))}
        </List.Section>
      )}
      {webdavNotSaved.length > 0 && (
        <List.Section title="Discovered WebDAV Servers">
          {webdavNotSaved.map((h) => (
            <DiscoveredHostItem
              key={`${h.host}-${h.protocol}`}
              host={h.host}
              protocol={h.protocol}
              onServerAdded={load}
              onRefresh={runDiscovery}
            />
          ))}
        </List.Section>
      )}
      {computersNotKnown.length > 0 && (
        <List.Section title="Computers on Network">
          {computersNotKnown.map((c) => (
            <DiscoveredHostItem
              key={c.host}
              host={c.host}
              icon={COMPUTER_ICON}
              subtitle={c.model ?? "Computer on network"}
              onServerAdded={load}
              onRefresh={runDiscovery}
              onBrowse={() =>
                push(
                  <BrowseHostShares
                    server={{ id: c.host, host: c.host, protocol: "smb" }}
                    mounted={mounted}
                    volumes={volumes}
                    onMountRequested={pollUntilMounted}
                    onChanged={refreshMounted}
                    onServerAdded={load}
                  />,
                )
              }
            />
          ))}
        </List.Section>
      )}
      {otherDevicesNotSaved.length > 0 && (
        <List.Section title="Other Devices on Network">
          {otherDevicesNotSaved.map((host) => (
            <DiscoveredHostItem key={host} host={host} onServerAdded={load} onRefresh={runDiscovery} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
