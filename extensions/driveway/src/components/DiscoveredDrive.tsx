import {
  ActionPanel,
  Action,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Icon,
  Color,
  useNavigation,
  List,
  Keyboard,
} from "@raycast/api";
import { discoveryUsernameFor } from "../lib/preferences";
import { VolumeUsage, usageForMountPoint, formatUsage } from "../lib/disk-usage";
import { ServerForm, ServerFormInput } from "./ServerForm";
import { buildShare, PROTOCOL_LABELS, Protocol } from "../lib/share";
import {
  connectShare,
  findMountedShare,
  openMountPoint,
  unmountMountPoint,
  unmountShare,
  MountLocation,
  UnreachableError,
} from "../lib/mount";
import { errorText } from "../lib/errors";
import { refreshMenuBar } from "../lib/menu-bar-cache";
import { addServer, DuplicateServerError } from "../lib/storage";

// One icon per kind of discovered thing, so the list reads at a glance:
// a share you can mount, a server to sign in to, a web-based server, a
// machine that only announced itself.
// Finder shows every network server as a screen, whatever protocol it
// speaks, and keeps drive shapes for things you can actually mount. Same
// idea here, so protocol is carried by the subtitle and tag rather than by
// four icon shapes nobody can tell apart at 16px.
//
// Swap these four if the shapes read better the other way round; nothing
// else needs to change.
export const SERVER_ICON = Icon.Monitor; // a host you sign in to
export const SHARE_ICON = Icon.HardDrive; // a share you can mount
export const DEVICE_ICON = Icon.Network; // answered a ping, nothing more
export const COMPUTER_ICON = { source: Icon.Desktop, tintColor: Color.SecondaryText };

// Discovered rows sit in secondary grey so saved drives stay the list your
// eye lands on. Colour means one of two things only: green for connected,
// orange for the protocol that sends credentials in the clear.
export function discoveredHostIcon(protocol?: Protocol): { source: Icon; tintColor?: Color } {
  switch (protocol) {
    case "smb":
    case "webdav":
      return { source: SERVER_ICON, tintColor: Color.SecondaryText };
    case "webdav-http":
      return { source: SERVER_ICON, tintColor: Color.Orange };
    default:
      return { source: DEVICE_ICON, tintColor: Color.SecondaryText };
  }
}

// Saved drives keep full-strength icons, so they stay the primary list
// against the grey discovered rows.
export function savedDriveIcon(
  entry: { path?: string; protocol?: Protocol },
  connected: boolean,
): { source: Icon; tintColor?: Color } {
  if (connected) return { source: SHARE_ICON, tintColor: Color.Green };
  // No share chosen yet, so this is still a server rather than a drive.
  if (!entry.path?.trim()) return { source: SERVER_ICON };
  if ((entry.protocol ?? "smb") === "webdav-http") return { source: SHARE_ICON, tintColor: Color.Orange };
  return { source: SHARE_ICON };
}

// Usage tags for any mounted share, saved or discovered, matched by mount point.
export function diskUsageAccessories(mountPoint: string | undefined, volumes: VolumeUsage[]) {
  if (!mountPoint) return [];
  const usage = usageForMountPoint(mountPoint, volumes);
  if (!usage) return [];

  const sizes = formatUsage(usage.usedBytes, usage.totalBytes);
  const freePercent = 100 - usage.percentUsed;
  const severity = usage.percentUsed > 75 ? Color.Red : usage.percentUsed >= 25 ? Color.Yellow : Color.Green;

  return [
    ...(sizes ? [{ tag: { value: sizes }, tooltip: "Used / Total" }] : []),
    { tag: { value: `${freePercent}%`, color: severity }, tooltip: "Free" },
  ];
}

// Pushed in-extension rather than launched as a command, so the caller's
// list actually refreshes on return.
export function AddServer({
  onSaved,
  onDuplicate,
  initialValues,
}: {
  onSaved: () => void;
  onDuplicate?: (existingId: string) => void;
  initialValues?: ServerFormInput;
}) {
  const { pop } = useNavigation();

  async function handleSave(values: ServerFormInput) {
    await addServer(values);
    await showToast({
      style: Toast.Style.Success,
      title: "Drive added",
      message: values.alias ?? `${values.host}/${values.path}`,
    });
    onSaved();
    pop();
  }

  return (
    <ServerForm
      submitTitle="Add Drive"
      initialValues={initialValues}
      onSave={handleSave}
      // Popping here rather than in the caller keeps this component's own
      // push/pop paired. Without a handler ServerForm opens Manage Drives.
      onDuplicate={
        onDuplicate &&
        ((existingId) => {
          onDuplicate(existingId);
          pop();
        })
      }
    />
  );
}

// A share that isn't saved: either discovered on the network, or mounted
// without being saved.
export function DiscoveredDriveItem(props: {
  vol: string;
  host: string;
  // Absent for a discovered SMB share, which is all discovery enumerates.
  protocol?: Protocol;
  // Set when this row stands for one known volume rather than a share that has
  // to be looked up, so two mounts of the same share stay apart.
  mountPoint?: string;
  mounted: MountLocation[];
  volumes: VolumeUsage[];
  onChanged: () => void;
  onMountRequested: (entry: { host: string; path?: string }) => Promise<MountLocation | undefined>;
  onUnmountAll: () => Promise<void>;
  onServerAdded: () => void;
  onRefresh?: () => void;
}) {
  const match = props.mountPoint
    ? props.mounted.find((share) => share.mountPoint === props.mountPoint)
    : findMountedShare(props.mounted, { host: props.host, path: props.vol, protocol: props.protocol });
  const mnt = Boolean(match);

  return (
    <List.Item
      title={props.vol}
      subtitle={props.host}
      actions={
        <DiscoveredDriveActions
          vol={props.vol}
          host={props.host}
          protocol={props.protocol}
          mountPoint={match?.mountPoint}
          mounted={mnt}
          onChanged={props.onChanged}
          onMountRequested={props.onMountRequested}
          onUnmountAll={props.onUnmountAll}
          onServerAdded={props.onServerAdded}
          onRefresh={props.onRefresh}
        />
      }
      icon={{ source: SHARE_ICON, tintColor: mnt ? Color.Green : Color.SecondaryText }}
      accessories={[
        ...(mnt ? [{ tag: { value: "Connected", color: Color.Green }, icon: Icon.CheckCircle }] : []),
        ...diskUsageAccessories(match?.mountPoint, props.volumes),
      ]}
    />
  );
}

function DiscoveredDriveActions(props: {
  vol: string;
  host: string;
  protocol?: Protocol;
  mountPoint: string | undefined;
  mounted: boolean;
  onChanged: () => void;
  onMountRequested: (entry: { host: string; path?: string }) => Promise<MountLocation | undefined>;
  onUnmountAll: () => Promise<void>;
  onServerAdded: () => void;
  onRefresh?: () => void;
}) {
  const { push } = useNavigation();

  async function doMount(): Promise<MountLocation | undefined> {
    const toast = await showToast({ title: `Mounting ${props.vol}…`, style: Toast.Style.Animated });
    try {
      const share = buildShare({ id: props.vol, host: props.host, path: props.vol, protocol: props.protocol });
      await connectShare(share);
      toast.style = Toast.Style.Success;
      toast.title = `${props.vol} Mount requested`;
      const match = await props.onMountRequested({ host: props.host, path: props.vol });
      if (match) {
        toast.title = `${props.vol} Mounted`;
      }
      await refreshMenuBar();
      return match;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof UnreachableError) {
        toast.title = error.message;
      } else {
        toast.title = `Couldn't mount ${props.vol}`;
        toast.message = errorText(error, "Mounting failed.");
      }
      return undefined;
    }
  }

  async function doUnmount() {
    const toast = await showToast({ title: `Unmounting ${props.vol}…`, style: Toast.Style.Animated });
    try {
      // The clicked volume, when the caller named one; otherwise whichever
      // mount matches the share.
      if (props.mountPoint) {
        await unmountMountPoint(props.mountPoint);
      } else {
        await unmountShare({ host: props.host, path: props.vol, protocol: props.protocol });
      }
      toast.style = Toast.Style.Success;
      toast.title = `${props.vol} Unmounted`;
      props.onChanged();
      await refreshMenuBar();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't unmount ${props.vol}`;
      toast.message = errorText(error, "Unmounting failed.");
    }
  }

  async function saveToNetworkDrives() {
    try {
      await addServer({
        host: props.host,
        path: props.vol,
        protocol: props.protocol,
        user: discoveryUsernameFor(props.host) || undefined,
      });
    } catch (error) {
      if (!(error instanceof DuplicateServerError)) throw error;
      await showToast({ title: "Drive already added", message: error.message });
      return;
    }
    await refreshMenuBar();
    await showToast({ style: Toast.Style.Success, title: "Saved to Drives", message: props.vol });
    props.onServerAdded();
  }

  return (
    <ActionPanel>
      {/* This share, then the list it could join, then the one action that
          touches every drive on the host. A single Mount or Unmount reads the
          current state, rather than offering both and leaving it to be worked
          out; it keeps whichever shortcut matches what it does. */}
      <ActionPanel.Section>
        <Action
          title={props.mounted ? "Unmount" : "Mount"}
          icon={props.mounted ? Icon.Eject : Icon.Plug}
          shortcut={props.mounted ? { modifiers: ["ctrl"], key: "x" } : Keyboard.Shortcut.Common.Open}
          onAction={props.mounted ? doUnmount : doMount}
        />
        <Action
          title="Mount and Open"
          icon={Icon.Finder}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={async () => {
            // Already mounted: open it. Mounting again doesn't no-op, it
            // attaches a second copy at "/Volumes/<name>-1".
            if (props.mounted && props.mountPoint) {
              openMountPoint(props.mountPoint);
              return;
            }

            const match = await doMount();
            const mountPoint = match?.mountPoint ?? props.mountPoint;
            if (mountPoint) {
              openMountPoint(mountPoint);
            }
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Save to Drives"
          icon={Icon.SaveDocument}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={saveToNetworkDrives}
        />
        <Action
          title="Add Drive"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => push(<AddServer onSaved={props.onServerAdded} />)}
        />
        {props.onRefresh && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Unmount Everything on This Host"
          icon={Icon.Eject}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            if (
              await confirmAlert({
                icon: Icon.Eject,
                title: `Unmount every drive on ${props.host}?`,
                message: "Drives from other hosts are left alone.",
                primaryAction: { title: "Unmount All", style: Alert.ActionStyle.Destructive },
              })
            ) {
              await props.onUnmountAll();
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// A host with no enumerable shares: WebDAV, or a ping-only device with no
// known protocol. Either way the only action is adding a path by hand.
export function DiscoveredHostItem(props: {
  host: string;
  protocol?: Protocol;
  onServerAdded: () => void;
  onRefresh?: () => void;
  // Supplied for an SMB host whose shares need credentials. The caller owns
  // the browse view, so this component doesn't have to import it.
  onBrowse?: () => void;
  subtitle?: string;
  // Overrides the protocol-derived icon, for a machine with no known service.
  icon?: { source: Icon; tintColor?: Color };
}) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={props.host}
      subtitle={props.subtitle ?? (props.protocol ? PROTOCOL_LABELS[props.protocol] : "Device found on network")}
      icon={props.icon ?? discoveredHostIcon(props.protocol)}
      actions={
        <ActionPanel>
          {props.onBrowse && (
            <Action
              title="Browse Shares on This Host"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              onAction={props.onBrowse}
            />
          )}
          <Action
            title="Add Drive"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() =>
              push(
                <AddServer
                  onSaved={props.onServerAdded}
                  initialValues={{ host: props.host, path: "", protocol: props.protocol }}
                />,
              )
            }
          />
          {props.onRefresh && (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
