import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  closeMainWindow,
  showHUD,
  Color,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { useState, useCallback, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Group, Activity, getActivities, stopTracking, deleteActivity, updateActivityStatus, ItemStatus } from "../db";
import { showErrorHUD, formatDuration, refreshMenuBar, sortByDuration } from "../utils";
import { SelectActionView } from "./SelectActionView";
import { CreateActivityView } from "./CreateActivityView";
import { RenameActivityView } from "./RenameActivityView";

interface ActivityListProps {
  group: Group;
  onGroupChange?: () => void;
}

export function ActivityListView({ group, onGroupChange }: ActivityListProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: activities = [],
    isLoading,
    mutate: refreshActivities,
  } = useCachedPromise(getActivities, [group.uuid], {
    onError: (error) => showErrorHUD("loading activities", error),
  });

  const handleStopTracking = useCallback(async () => {
    try {
      await stopTracking();
      refreshMenuBar();
      closeMainWindow();
      await showHUD("Stopped tracking");
    } catch (error) {
      await showErrorHUD("stopping tracking", error);
    }
  }, []);

  const handleDeleteActivity = useCallback(
    async (activity: Activity) => {
      if (
        await confirmAlert({
          title: `Delete "${activity.title}"?`,
          message: "This will permanently delete the activity and all its time entries.",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
      ) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
        try {
          if (activity.tracking) {
            await stopTracking();
          }
          await deleteActivity(group.uuid, activity.uuid);
          toast.style = Toast.Style.Success;
          toast.title = "Activity deleted";
          refreshMenuBar();
          await refreshActivities();
          onGroupChange?.();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to delete";
          await showErrorHUD("deleting activity", error);
        }
      }
    },
    [group.uuid, refreshActivities, onGroupChange]
  );

  const handleActivityStatus = useCallback(
    async (activity: Activity, status: ItemStatus) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating..." });
      try {
        await updateActivityStatus(group.uuid, activity.uuid, status);
        // Clear selection first to force Raycast to re-apply it
        setSelectedId(null);
        await refreshActivities();
        // Use setTimeout to set selection after render
        setTimeout(() => setSelectedId(activity.uuid), 0);
        toast.style = Toast.Style.Success;
        toast.title = "Status updated";
        onGroupChange?.();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update";
        await showErrorHUD("updating status", error);
      }
    },
    [group.uuid, refreshActivities, onGroupChange]
  );

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => a.title.toLowerCase().includes(searchText.toLowerCase()));
  }, [activities, searchText]);

  const activeActivityUuid = useMemo(() => activities.find((a) => a.tracking)?.uuid, [activities]);

  const sortedActivities = useMemo(
    () => sortByDuration(filteredActivities, activeActivityUuid),
    [filteredActivities, activeActivityUuid]
  );

  const activeActivities = useMemo(() => sortedActivities.filter((a) => a.status === "active"), [sortedActivities]);
  const archivedActivities = useMemo(() => sortedActivities.filter((a) => a.status === "archived"), [sortedActivities]);

  const renderItem = (activity: Activity) => {
    const isActive = !!activity.tracking;
    const elapsed = activity.tracking ? Math.floor(Date.now() / 1000) - activity.tracking.startTime : 0;
    const totalDuration = isActive ? activity.trackedDuration + elapsed : activity.trackedDuration;

    return (
      <List.Item
        key={activity.uuid}
        id={activity.uuid}
        title={activity.title}
        subtitle={activity.lastEntryDate ? new Date(activity.lastEntryDate).toLocaleDateString("de-DE") : undefined}
        icon={isActive ? { source: Icon.Clock, tintColor: Color.Orange } : Icon.Circle}
        accessories={
          [
            isActive && { tag: { value: formatDuration(elapsed), color: Color.Orange }, icon: Icon.Clock },
            totalDuration > 0 && { tag: { value: formatDuration(totalDuration), color: Color.Green } },
            activity.status === "archived" && { icon: { source: Icon.CheckCircle, tintColor: Color.SecondaryText } },
          ].filter(Boolean) as List.Item.Accessory[]
        }
        actions={
          <ActionPanel>
            {isActive ? (
              <Action title="Stop Tracking" icon={Icon.Stop} onAction={handleStopTracking} />
            ) : (
              <Action.Push
                title="Select"
                icon={Icon.ChevronRight}
                target={<SelectActionView group={group} activity={activity} />}
              />
            )}
            <Action.Push
              title="Rename"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RenameActivityView group={group} activity={activity} />}
            />
            {activity.status === "active" ? (
              <Action
                title="Archive"
                icon={Icon.Tray}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Archive "${activity.title}"?`,
                      message: "This will also archive all time entries for this activity.",
                      primaryAction: { title: "Archive" },
                    })
                  ) {
                    handleActivityStatus(activity, "archived");
                  }
                }}
              />
            ) : (
              <Action
                title="Unarchive"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => handleActivityStatus(activity, "active")}
              />
            )}
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleDeleteActivity(activity)}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search or create activity in ${group.title}...`}
      navigationTitle={group.title}
      selectedItemId={selectedId ?? undefined}
    >
      <List.Section>{activeActivities.map(renderItem)}</List.Section>
      {archivedActivities.length > 0 && (
        <List.Section title="Archived">{archivedActivities.map(renderItem)}</List.Section>
      )}
      <List.EmptyView
        title={searchText.trim() ? `Create activity "${searchText}"` : "No Activities Found"}
        description={
          searchText.trim() ? "Press Enter to create this activity" : "Type to search or create a new activity"
        }
        icon={searchText.trim() ? Icon.PlusCircle : Icon.List}
        actions={
          <ActionPanel>
            {searchText.trim() && (
              <Action.Push
                title={`Create "${searchText}"`}
                icon={Icon.PlusCircle}
                target={<CreateActivityView group={group} title={searchText} />}
              />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
