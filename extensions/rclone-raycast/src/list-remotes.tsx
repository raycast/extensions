import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import useRemoteList from "../hooks/useRemoteList";
import RemoteDetail from "../components/RemoteDetail";

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
        title="No remotes found"
        description="Use the Create Remote command to add one."
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
              <Action.Push title="View Remote" target={<RemoteDetail remote={remote.name} onUpdate={revalidate} />} />
              <Action
                title="Refresh Remotes"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={async () => {
                  showToast({
                    title: "Refreshing remotes...",
                    style: Toast.Style.Animated,
                  });
                  await Promise.all([revalidate, new Promise((resolve) => setTimeout(resolve, 1000))]);
                  await showToast({
                    title: "Remotes refreshed",
                    style: Toast.Style.Success,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
