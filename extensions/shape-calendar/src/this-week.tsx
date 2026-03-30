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
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { getActivities, deleteActivity, updateActivity } from "./api/client";
import { Activity } from "./api/types";
import { sportNames } from "./constants";
import { formatDistance, formatDuration } from "./utils";

const DISTANCE_SPORTS = new Set(["run", "bike", "swim", "hike", "nordicski"]);
function formatWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return `${dayName} — ${monthDay}`;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekRange(): { from: string; to: string; allDates: string[] } {
  const { weekStartDay } = getPreferenceValues<Preferences>();
  const startDay = weekStartDay === "sunday" ? 0 : 1;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = (day - startDay + 7) % 7;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const allDates: string[] = [];
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    allDates.push(toLocalDateString(d));
  }

  return {
    from: toLocalDateString(weekStart),
    to: toLocalDateString(weekEnd),
    allDates,
  };
}

export default function Command() {
  const { from, to, allDates } = getWeekRange();

  const { isLoading, data, error, revalidate } = useCachedPromise(async () => {
    const res = await getActivities({ from, to, limit: 200 });
    return res.activities;
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load activities",
        message: error.message,
      });
    }
  }, [error]);

  const sections = useMemo(() => {
    const byDate = new Map<string, Activity[]>();
    for (const activity of data || []) {
      const key = activity.date.split("T")[0];
      const list = byDate.get(key) || [];
      list.push(activity);
      byDate.set(key, list);
    }

    return allDates.map((date) => ({
      date,
      activities: byDate.get(date) || [],
    }));
  }, [data, allDates]);

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

  return (
    <List searchBarPlaceholder="Search this week" isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load activities"
          description={error.message}
        />
      ) : null}
      {!error &&
        sections.map(({ date, activities }) => (
          <List.Section
            key={date}
            title={formatWeekday(date)}
            subtitle={
              activities.length === 0
                ? "Rest Day"
                : `${activities.length} ${activities.length === 1 ? "activity" : "activities"}`
            }
          >
            {activities.length > 0 ? (
              activities.map((activity) => {
                const sportName = sportNames[activity.sportType] ?? "Workout";
                return (
                  <List.Item
                    key={activity.id}
                    title={sportName}
                    subtitle={activity.title}
                    icon={
                      activity.completed
                        ? { source: Icon.CheckCircle, tintColor: Color.Green }
                        : new Date(activity.date) <
                            new Date(new Date().toISOString().split("T")[0])
                          ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                          : { source: Icon.Calendar, tintColor: Color.Orange }
                    }
                    accessories={[
                      ...(activity.load
                        ? [
                            {
                              text: String(activity.load),
                              icon: {
                                source: Icon.Heartbeat,
                                tintColor: Color.SecondaryText,
                              },
                            },
                          ]
                        : []),
                      ...(activity.distance &&
                      DISTANCE_SPORTS.has(activity.sportType)
                        ? [
                            {
                              text: formatDistance(activity.distance),
                              icon: {
                                source: Icon.ArrowRight,
                                tintColor: Color.SecondaryText,
                              },
                            },
                          ]
                        : []),
                      ...(activity.duration
                        ? [
                            {
                              text: formatDuration(activity.duration),
                              icon: {
                                source: Icon.Clock,
                                tintColor: Color.SecondaryText,
                              },
                            },
                          ]
                        : []),
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={
                            activity.completed
                              ? "Mark as Planned"
                              : "Mark as Completed"
                          }
                          icon={
                            activity.completed ? Icon.Circle : Icon.CheckCircle
                          }
                          onAction={() => handleToggleCompleted(activity)}
                        />
                        <Action
                          title="Delete Activity"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleDelete(activity)}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
            ) : (
              <List.Item
                title="Rest Day"
                icon={{ source: Icon.Moon, tintColor: Color.SecondaryText }}
              />
            )}
          </List.Section>
        ))}
    </List>
  );
}
