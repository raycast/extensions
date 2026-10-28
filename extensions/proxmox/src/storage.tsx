import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { type StorageListGroup, useStorageList } from "@/hooks/use-storage-list";
import { getStorageStatusIcon } from "@/utils/ui";
import { NoServersEmptyView } from "@/components/NoServersEmptyView";
import { ServerErrorItem } from "@/components/ServerErrorItem";
import { StorageDetail } from "@/components/StorageDetail";
import { ManageServers } from "@/screens/ManageServers";
import { StorageContentList } from "@/screens/StorageContentList";

const Command = () => {
  const { isLoading, groups, hasServers, revalidate } = useStorageList();
  const showSections = groups.length > 1;
  const showNoServers = !isLoading && !hasServers;

  const renderGroup = (group: StorageListGroup) => {
    const items =
      group.error !== undefined ? (
        <ServerErrorItem
          key={`${group.server.id}/error`}
          server={group.server}
          error={group.error}
          revalidate={revalidate}
        />
      ) : (
        group.storages.map((storage) => (
          <List.Item
            key={`${group.server.id}/${storage.id}`}
            title={storage.storage}
            icon={{ ...getStorageStatusIcon(storage.status), tooltip: storage.status }}
            accessories={[{ text: storage.maxdiskParsed, tooltip: `Max disk: ${storage.maxdiskParsed}` }]}
            keywords={[...storage.contentTypes, group.server.name]}
            detail={<StorageDetail storage={storage} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Content"
                  icon={Icon.List}
                  target={<StorageContentList server={storage.server} node={storage.node} id={storage.storage} />}
                />
              </ActionPanel>
            }
          />
        ))
      );

    return (
      <List.Section
        key={group.server.id}
        title={showSections ? group.server.name : undefined}
        subtitle={showSections && group.error === undefined ? `${group.storages.length}` : undefined}
      >
        {items}
      </List.Section>
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!showNoServers}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action.Push title="Manage Servers" icon={Icon.Gear} target={<ManageServers />} />
        </ActionPanel>
      }
    >
      {showNoServers ? <NoServersEmptyView /> : groups.map(renderGroup)}
    </List>
  );
};

export default Command;
