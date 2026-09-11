import {
  ActionPanel,
  List,
  Action,
  Toast,
  showToast,
  Color,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getActivities, deleteActivity, updateActivity } from "./api/client";
import { Activity, SportType } from "./api/types";
import { sportIcons, sportNames } from "./constants";
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevationGain,
  formatDate,
  formatStepsMarkdown,
  getDateRange,
} from "./utils";

const SPORT_TYPES: SportType[] = [
  "run",
  "bike",
  "swim",
  "hike",
  "yoga",
  "nordicski",
  "strength",
  "other",
];

export default function Command() {
  const [sportFilter, setSportFilter] = useState<string>("all");

  const { from, to } = getDateRange(90, 7);

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (sport: string) => {
      const params: {
        from: string;
        to: string;
        sportType?: SportType;
        limit: number;
      } = {
        from,
        to,
        limit: 200,
      };
      if (sport !== "all") {
        params.sportType = sport as SportType;
      }
      const res = await getActivities(params);
      return res.activities;
    },
    [sportFilter],
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load activities",
        message: error.message,
      });
    }
  }, [error]);

  async function handleDelete(activity: Activity) {
    if (
      await confirmAlert({
        title: "Delete Activity",
        message: `Are you sure you want to delete "${activity.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteActivity(activity.id);
        showToast({ style: Toast.Style.Success, title: "Activity deleted" });
        revalidate();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: String(err),
        });
      }
    }
  }

  async function handleToggleCompleted(activity: Activity) {
    try {
      await updateActivity(activity.id, { completed: !activity.completed });
      showToast({
        style: Toast.Style.Success,
        title: activity.completed ? "Marked as planned" : "Marked as completed",
      });
      revalidate();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String(err),
      });
    }
  }

  return (
    <List
      searchBarPlaceholder="Search activities"
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by sport"
          storeValue
          onChange={setSportFilter}
        >
          <List.Dropdown.Item title="All Sports" value="all" />
          <List.Dropdown.Section>
            {SPORT_TYPES.map((sport) => (
              <List.Dropdown.Item
                key={sport}
                title={sportNames[sport]}
                value={sport}
                icon={{
                  source: sportIcons[sport],
                  tintColor: Color.PrimaryText,
                }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load activities"
          description={error.message}
        />
      ) : (
        data?.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onDelete={() => handleDelete(activity)}
            onToggleCompleted={() => handleToggleCompleted(activity)}
          />
        ))
      )}
    </List>
  );
}

function ActivityItem({
  activity,
  onDelete,
  onToggleCompleted,
}: {
  activity: Activity;
  onDelete: () => void;
  onToggleCompleted: () => void;
}) {
  const sportName = sportNames[activity.sportType] ?? "Workout";
  const date = formatDate(activity.date);

  return (
    <List.Item
      title={sportName}
      accessories={[{ text: date }]}
      icon={
        activity.completed
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : new Date(activity.date) <
              new Date(new Date().toISOString().split("T")[0])
            ? { source: Icon.XMarkCircle, tintColor: Color.Red }
            : { source: Icon.Calendar, tintColor: Color.Orange }
      }
      keywords={[
        sportName,
        activity.title,
        activity.completed ? "done completed" : "planned",
      ]}
      detail={
        <List.Item.Detail
          markdown={
            [
              activity.description?.replace(/\n/g, "  \n"),
              activity.steps?.length
                ? formatStepsMarkdown(activity.steps)
                : null,
            ]
              .filter(Boolean)
              .join("\n\n") || undefined
          }
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Name"
                text={activity.title}
              />
              <List.Item.Detail.Metadata.Label
                title="Sport"
                text={sportName}
                icon={{
                  source: sportIcons[activity.sportType] ?? Icon.Heartbeat,
                  tintColor: Color.PrimaryText,
                }}
              />
              <List.Item.Detail.Metadata.Separator />

              {activity.distance ? (
                <List.Item.Detail.Metadata.Label
                  title="Distance"
                  text={formatDistance(activity.distance)}
                />
              ) : null}
              {activity.speed ? (
                <List.Item.Detail.Metadata.Label
                  title={
                    activity.sportType === "run" ||
                    activity.sportType === "swim"
                      ? "Pace"
                      : "Speed"
                  }
                  text={formatSpeed(activity.speed, activity.sportType)}
                />
              ) : null}
              {activity.duration ? (
                <List.Item.Detail.Metadata.Label
                  title="Duration"
                  text={formatDuration(activity.duration)}
                />
              ) : null}
              {activity.elevationGain ? (
                <List.Item.Detail.Metadata.Label
                  title="Elevation Gain"
                  text={formatElevationGain(activity.elevationGain)}
                />
              ) : null}
              {activity.heartRate ? (
                <List.Item.Detail.Metadata.Label
                  title="Heart Rate"
                  text={`${activity.heartRate} bpm`}
                />
              ) : null}
              {activity.power ? (
                <List.Item.Detail.Metadata.Label
                  title="Power"
                  text={`${activity.power} W`}
                />
              ) : null}
              {activity.load ? (
                <List.Item.Detail.Metadata.Label
                  title="Training Load"
                  text={String(activity.load)}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={activity.completed ? "Mark as Planned" : "Mark as Completed"}
            icon={activity.completed ? Icon.Circle : Icon.CheckCircle}
            onAction={onToggleCompleted}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Delete Activity"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onDelete}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}
