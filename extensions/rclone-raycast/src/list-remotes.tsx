import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import useRemoteList from "./hooks/useRemoteList";
import RemoteDetail from "./components/RemoteDetail";
import { showFailureToast } from "@raycast/utils";
import rclone from "./lib/rclone";

export default function Command() {
  const { data, isLoading, error, revalidate } = useRemoteList();

  const remotes = data ?? [];

  const emptyView =
    !isLoading &&
    (error ? (
      <List.EmptyView
        icon={Icon.Warning}
        title="Failed to load remotes"
        description={error?.message ?? "Unknown error"}
      />
    ) : remotes.length === 0 ? (
      <List.EmptyView
        icon={Icon.Network}
        title="No Remotes Found"
        description="Use the Create Remote command to add one."
        actions={
          <ActionPanel>
            <Action
              title="Create Remote"
              icon={Icon.Plus}
              onAction={async () => {
                try {
                  await launchCommand({ name: "create-remote", type: LaunchType.UserInitiated });
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to create remote" });
                }
              }}
            />
          </ActionPanel>
        }
      />
    ) : null);

  return (
    <List searchBarPlaceholder="Search remotes" isLoading={isLoading}>
      {emptyView}
      {remotes.map((remote) => (
        <List.Item
          key={remote.name}
          icon={Icon.Network}
          title={remote.name}
          accessories={remote.type ? [{ tag: remote.type }] : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Remote"
                icon={Icon.AppWindowSidebarLeft}
                target={<RemoteDetail remote={remote.name} onUpdate={revalidate} />}
              />
              <Action
                title="Refresh Remotes"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={async () => {
                  showToast({
                    title: "Refreshing remotes...",
                    style: Toast.Style.Animated,
                  });
                  revalidate();
                  await showToast({
                    title: "Remotes refreshed",
                    style: Toast.Style.Success,
                  });
                }}
              />
              <Action
                title="Remove Remote"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleRemoveRemote(remote.name, revalidate)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function handleRemoveRemote(remote: string, onUpdate?: () => void) {
  const confirmed = await confirmAlert({
    title: `Remove ${remote}?`,
    message: "This action cannot be undone.",
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    await rclone("/config/delete", {
      params: {
        query: {
          name: remote,
        },
      },
    });
    await showToast({ style: Toast.Style.Success, title: `${remote} removed` });
    onUpdate?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Failed to remove remote", message });
  }
}
