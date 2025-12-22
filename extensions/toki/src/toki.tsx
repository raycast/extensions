import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  confirmAlert,
  Alert,
  Keyboard,
  LaunchProps,
} from "@raycast/api";
import { useState, useMemo, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Group, getGroups, stopTracking, deleteGroup, updateGroupStatus, ItemStatus } from "./db";
import { showErrorHUD, formatDuration, refreshMenuBar, sortByDuration } from "./utils";
import { ActivityListView } from "./views/ActivityListView";
import { CreateGroupView } from "./views/CreateGroupView";
import { RenameGroupView } from "./views/RenameGroupView";
import { SetColorView } from "./views/SetColorView";

interface LaunchContext {
  groupUuid?: string;
}

export default function TokiCommand(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const contextGroupUuid = props.launchContext?.groupUuid;
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: groups = [],
    isLoading: groupsLoading,
    revalidate: refreshGroups,
  } = useCachedPromise(getGroups, [], {
    onError: (error) => showErrorHUD("loading groups", error),
  });

  const handleStopTracking = useCallback(async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping..." });
    try {
      await stopTracking();
      toast.style = Toast.Style.Success;
      toast.title = "Stopped tracking";
      refreshMenuBar();
      await refreshGroups();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop";
      await showErrorHUD("stopping tracking", error);
    }
  }, [refreshGroups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => group.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [groups, searchText]);

  const activeGroupUuid = useMemo(() => groups.find((g) => g.tracking)?.uuid, [groups]);

  const sortedGroups = useMemo(
    () => sortByDuration(filteredGroups, activeGroupUuid),
    [filteredGroups, activeGroupUuid]
  );

  const activeGroups = useMemo(() => sortedGroups.filter((g) => g.status === "active"), [sortedGroups]);
  const archivedGroups = useMemo(() => sortedGroups.filter((g) => g.status === "archived"), [sortedGroups]);

  // Find context group for deep linking
  const contextGroup = useMemo(
    () => (contextGroupUuid ? groups.find((g) => g.uuid === contextGroupUuid) : undefined),
    [groups, contextGroupUuid]
  );

  const handleDeleteGroup = useCallback(
    async (group: Group) => {
      if (
        await confirmAlert({
          title: `Delete "${group.title}"?`,
          message: "This will permanently delete the group and all its activities.",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
        try {
          if (group.tracking) {
            await stopTracking();
          }
          await deleteGroup(group.uuid);
          toast.style = Toast.Style.Success;
          toast.title = "Group deleted";
          refreshMenuBar();
          await refreshGroups();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to delete";
          await showErrorHUD("deleting group", error);
        }
      }
    },
    [refreshGroups]
  );

  const handleGroupStatus = useCallback(
    async (group: Group, status: ItemStatus) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
      try {
        await updateGroupStatus(group.uuid, status);
        setSelectedId(null);
        await refreshGroups();
        setTimeout(() => setSelectedId(group.uuid), 0);
        toast.style = Toast.Style.Success;
        toast.title = "Status updated";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update";
        await showErrorHUD("updating status", error);
      }
    },
    [refreshGroups]
  );

  // If launched with a groupUuid context, show ActivityListView directly
  if (contextGroup) {
    return <ActivityListView group={contextGroup} onGroupChange={refreshGroups} />;
  }

  const renderItem = (group: Group) => {
    const isTracking = !!group.tracking;
    const elapsed = group.tracking ? Math.floor(Date.now() / 1000) - group.tracking.startTime : 0;
    const totalDuration = isTracking ? group.trackedDuration + elapsed : group.trackedDuration;

    return (
      <List.Item
        key={group.uuid}
        id={group.uuid}
        title={group.title}
        icon={{ source: Icon.Folder, tintColor: group.color || undefined }}
        accessories={
          [
            isTracking && { tag: { value: formatDuration(elapsed), color: Color.Orange }, icon: Icon.Clock },
            totalDuration > 0 && {
              tag: {
                value: formatDuration(totalDuration),
                color: Color.Green,
              },
            },
            group.status === "archived" && { icon: { source: Icon.CheckCircle, tintColor: Color.SecondaryText } },
          ].filter(Boolean) as List.Item.Accessory[]
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="View Activities"
              icon={Icon.List}
              target={<ActivityListView group={group} onGroupChange={refreshGroups} />}
            />
            {isTracking && <Action title="Stop Tracking" icon={Icon.Stop} onAction={handleStopTracking} />}
            <Action.Push
              title="Rename"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RenameGroupView group={group} />}
            />
            <Action.Push title="Set Color" icon={Icon.EyeDropper} target={<SetColorView group={group} />} />
            {group.status === "active" ? (
              <Action
                title="Archive"
                icon={Icon.Tray}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Archive "${group.title}"?`,
                      message: "This will also archive all activities and time entries in this group.",
                      primaryAction: { title: "Archive" },
                    })
                  ) {
                    handleGroupStatus(group, "archived");
                  }
                }}
              />
            ) : (
              <Action
                title="Unarchive"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => handleGroupStatus(group, "active")}
              />
            )}
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleDeleteGroup(group)}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      navigationTitle="Toki"
      searchBarPlaceholder="Search or create groups"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={groupsLoading}
      selectedItemId={selectedId ?? undefined}
    >
      <List.Section>{activeGroups.map(renderItem)}</List.Section>
      {archivedGroups.length > 0 && <List.Section title="Archived">{archivedGroups.map(renderItem)}</List.Section>}
      {!groupsLoading && sortedGroups.length === 0 && (
        <List.EmptyView
          title={searchText.trim() ? `Create group "${searchText}"` : "No Groups Found"}
          description={searchText.trim() ? "Press Enter to create this group" : "Type to search or create a new group"}
          icon={searchText.trim() ? Icon.PlusCircle : Icon.List}
          actions={
            <ActionPanel>
              {searchText.trim() && (
                <Action.Push
                  title={`Create "${searchText}"`}
                  icon={Icon.PlusCircle}
                  target={<CreateGroupView title={searchText} onGroupCreated={refreshGroups} />}
                />
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
