import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ServerForm, ServerFormInput } from "./components/ServerForm";
import { buildShare, ServerEntry } from "./lib/share";
import {
  findMountedShare,
  isSmbReachable,
  listMountedSmbShares,
  mountShare,
  unmountShare,
} from "./lib/mount";
import { getServers, removeServer, updateServer } from "./lib/storage";

function EditServer({
  server,
  onSaved,
}: {
  server: ServerEntry;
  onSaved: () => void;
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
      initialValues={server}
      onSave={handleSave}
    />
  );
}

export default function Command() {
  const [servers, setServers] = useState<ServerEntry[] | null>(null);
  const [mountedHosts, setMountedHosts] = useState<Set<string>>(new Set());
  const { push } = useNavigation();

  async function load() {
    const [entries, mounted] = await Promise.all([
      getServers(),
      listMountedSmbShares(),
    ]);
    setServers(entries);
    setMountedHosts(
      new Set(
        entries
          .filter((entry) => findMountedShare(mounted, entry))
          .map((entry) => entry.id),
      ),
    );
  }

  useEffect(() => {
    load();
  }, []);

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

  async function handleConnect(server: ServerEntry) {
    let share;
    try {
      share = buildShare(server);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid server",
        message:
          error instanceof Error
            ? error.message
            : "Check the saved host and path.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${share.label}…`,
    });

    if (!(await isSmbReachable(share.host))) {
      toast.style = Toast.Style.Failure;
      toast.title = `${share.label} is unreachable`;
      return;
    }

    try {
      await mountShare(share);
      toast.style = Toast.Style.Success;
      toast.title = `Mount requested for ${share.label}`;
      await load();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't mount ${share.label}`;
      toast.message =
        error instanceof Error
          ? error.message.replace(/\s+/g, " ")
          : "open failed";
    }
  }

  async function handleUnmount(server: ServerEntry) {
    let share;
    try {
      share = buildShare(server);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid server",
        message:
          error instanceof Error
            ? error.message
            : "Check the saved host and path.",
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
      toast.message =
        error instanceof Error
          ? error.message.replace(/\s+/g, " ")
          : "unmount failed";
    }
  }

  return (
    <List isLoading={servers === null}>
      {(servers ?? []).map((server) => {
        let label = server.alias || server.host;
        try {
          label = buildShare(server).label;
        } catch {
          // keep the fallback label above if the saved entry is no longer valid
        }

        const connected = mountedHosts.has(server.id);

        return (
          <List.Item
            key={server.id}
            title={label}
            subtitle={`${server.host}/${server.path}`}
            accessories={[
              ...(connected
                ? [
                    {
                      tag: { value: "Connected", color: Color.Green },
                      icon: Icon.CheckCircle,
                    },
                  ]
                : []),
              ...(server.user ? [{ text: server.user }] : []),
            ]}
            icon={Icon.HardDrive}
            actions={
              <ActionPanel>
                {connected ? (
                  <Action
                    title="Unmount"
                    icon={Icon.Eject}
                    onAction={() => handleUnmount(server)}
                  />
                ) : (
                  <Action
                    title="Connect"
                    icon={Icon.Plug}
                    onAction={() => handleConnect(server)}
                  />
                )}
                <Action
                  title="Edit Server"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<EditServer server={server} onSaved={load} />)
                  }
                />
                <Action
                  title="Remove Server"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemove(server)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
