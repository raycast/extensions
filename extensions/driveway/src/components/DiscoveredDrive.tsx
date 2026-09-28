import {
  ActionPanel,
  Action,
  confirmAlert,
  showToast,
  Toast,
  Icon,
  Color,
  useNavigation,
  List,
  Keyboard,
} from "@raycast/api";
import { exec } from "child_process";
import { discoveryUsername } from "../lib/preferences";
import { VolumeUsage, usageForMountPoint } from "../lib/disk-usage";
import { ServerForm, ServerFormInput } from "./ServerForm";
import { buildShare, PROTOCOL_LABELS, Protocol } from "../lib/share";
import { connectShare, findMountedShare, unmountShare, MountLocation, UnreachableError } from "../lib/mount";
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

  // Trim trailing zeros (7.00 -> 7) so round sizes don't show fake precision.
  const formatTB = (gb: number) => parseFloat((gb / 1024).toFixed(2)).toString();
  const freePercent = 100 - usage.percentUsed;
  const severity = usage.percentUsed > 75 ? Color.Red : usage.percentUsed >= 25 ? Color.Yellow : Color.Green;

  return [
    { tag: { value: `${formatTB(usage.usedGb)} / ${formatTB(usage.totalGb)} TB` }, tooltip: "Used / Total" },
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
      title: "Server added",
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

// A discovered share that hasn't been saved yet.
export function DiscoveredDriveItem(props: {
  vol: string;
  host: string;
  mounted: MountLocation[];
  volumes: VolumeUsage[];
  onChanged: () => void;
  onMountRequested: (entry: { host: string; path?: string }) => Promise<MountLocation | undefined>;
  onUnmountAll: () => Promise<void>;
  onServerAdded: () => void;
  onRefresh?: () => void;
}) {
  const match = findMountedShare(props.mounted, { host: props.host, path: props.vol });
  const mnt = Boolean(match);

  return (
    <List.Item
      title={props.vol}
      subtitle={props.host}
      actions={
        <DiscoveredDriveActions
          vol={props.vol}
          host={props.host}
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
    const toast = await showToast({ title: "Mounting...", style: Toast.Style.Animated });
    try {
      const share = buildShare({ id: props.vol, host: props.host, path: props.vol });
      await connectShare(share);
      toast.style = Toast.Style.Success;
      toast.title = `${props.vol} Mount requested`;
      const match = await props.onMountRequested({ host: props.host, path: props.vol });
      if (match) {
        toast.title = `${props.vol} Mounted`;
      }
      return match;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      if (error instanceof UnreachableError) {
        toast.title = error.message;
      } else {
        toast.title = "Action Failed";
        toast.message = error instanceof Error ? error.message.replace(/\s+/g, " ") : "open failed";
      }
      return undefined;
    }
  }

  async function doUnmount() {
    const toast = await showToast({ title: "Unmounting...", style: Toast.Style.Animated });
    try {
      await unmountShare({ host: props.host, path: props.vol });
      toast.style = Toast.Style.Success;
      toast.title = `${props.vol} Unmounted`;
      props.onChanged();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Action Failed";
      toast.message = error instanceof Error ? error.message.replace(/\s+/g, " ") : "unmount failed";
    }
  }

  async function saveToNetworkDrives() {
    try {
      await addServer({ host: props.host, path: props.vol, user: discoveryUsername() || undefined });
    } catch (error) {
      if (!(error instanceof DuplicateServerError)) throw error;
      await showToast({ title: "Drive already added", message: error.message });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: "Saved to Drives", message: props.vol });
    props.onServerAdded();
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Quick Option">
        <Action
          title={props.mounted ? "Unmount" : "Mount"}
          icon={props.mounted ? Icon.Eject : Icon.Plug}
          onAction={props.mounted ? doUnmount : doMount}
        />
        <Action
          title="Mount and Open"
          icon={Icon.Finder}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={async () => {
            const match = await doMount();
            const mountPoint = match?.mountPoint ?? props.mountPoint;
            if (mountPoint) {
              exec(`open "${mountPoint}"`);
            }
          }}
        ></Action>
        <Action
          title="Save to Drives"
          icon={Icon.SaveDocument}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={saveToNetworkDrives}
        ></Action>
        <Action
          title="Unmount All"
          icon={Icon.Eject}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={async () => {
            if (
              await confirmAlert({
                icon: Icon.AlarmRinging,
                title: `Are you sure you want to \n "Unmount All Drives" ?`,
              })
            ) {
              await props.onUnmountAll();
            }
          }}
        ></Action>
        <Action
          title="Add Drive"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => push(<AddServer onSaved={props.onServerAdded} />)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Specific Option">
        <Action title="Mount" icon={Icon.Plug} shortcut={Keyboard.Shortcut.Common.Open} onAction={doMount}></Action>
        <Action
          title="Unmount"
          icon={Icon.Eject}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={doUnmount}
        ></Action>
      </ActionPanel.Section>
      {props.onRefresh && (
        <ActionPanel.Section>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel.Section>
      )}
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
              title="Browse Shares on This Host…"
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
