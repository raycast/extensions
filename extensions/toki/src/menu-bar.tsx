import { MenuBarExtra, Icon, Color, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  getTrackingStatus,
  stopTracking,
  getDaysStats,
  getRecentActivities,
  startTracking,
  RecentActivity,
} from "./db";
import { formatDuration, showErrorHUD } from "./utils";

export default function Command() {
  const {
    data: activeSession,
    isLoading: trackingLoading,
    mutate: refreshTracking,
  } = useCachedPromise(getTrackingStatus);
  const { data: daysStats, isLoading: daysLoading, mutate: refreshDays } = useCachedPromise(getDaysStats);
  const {
    data: recentActivities,
    isLoading: recentLoading,
    mutate: refreshRecent,
  } = useCachedPromise(getRecentActivities);

  const isLoading = trackingLoading || daysLoading || recentLoading;

  // Update timer display every minute while tracking
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const elapsed = activeSession ? Math.floor(Date.now() / 1000) - activeSession.startTime : 0;
  const elapsedTime = activeSession ? formatDuration(elapsed) : undefined;

  // Show today's duration (first day) or 00:00
  const todayDuration =
    daysStats?.days[0]?.date === new Date().toISOString().slice(0, 10) ? daysStats.days[0].duration : 0;
  const todayTime = formatDuration(todayDuration);

  const handleStop = async () => {
    try {
      await stopTracking();
      await Promise.all([refreshTracking(), refreshDays(), refreshRecent()]);
      await showHUD("Stopped tracking");
    } catch (error) {
      await showErrorHUD("stopping tracking", error);
    }
  };

  const handleStartTracking = async (activity: RecentActivity) => {
    try {
      await startTracking(activity.groupUuid, activity.activityUuid);
      await Promise.all([refreshTracking(), refreshDays(), refreshRecent()]);
      await showHUD(`Started tracking ${activity.activityTitle}`);
    } catch (error) {
      await showErrorHUD("starting tracking", error);
    }
  };

  const openToki = (groupUuid?: string) => {
    launchCommand({
      name: "toki",
      type: LaunchType.UserInitiated,
      context: groupUuid ? { groupUuid } : undefined,
    });
  };

  const hasDaysData = daysStats && daysStats.days.length > 0;

  return (
    <MenuBarExtra
      icon={
        activeSession
          ? { source: Icon.PlayFilled, tintColor: activeSession.groupColor }
          : { source: Icon.Clock, tintColor: todayDuration === 0 ? Color.SecondaryText : undefined }
      }
      title={activeSession ? elapsedTime : todayTime}
      tooltip={activeSession ? `${activeSession.activityTitle} (${activeSession.groupTitle})` : "Time tracked today"}
      isLoading={isLoading}
    >
      {activeSession && (
        <MenuBarExtra.Section title="Now Tracking">
          <MenuBarExtra.Item
            title={activeSession.activityTitle}
            subtitle={`${activeSession.groupTitle} · ${formatDuration(activeSession.trackedDuration + elapsed)}`}
            onAction={() => openToki(activeSession.groupUuid)}
          />
          <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={handleStop} />
        </MenuBarExtra.Section>
      )}
      {hasDaysData
        ? daysStats.days.map((day) => (
            <MenuBarExtra.Section key={day.date} title={day.label}>
              {day.activities.map((activity, index) => (
                <MenuBarExtra.Item
                  key={`${day.date}-${index}`}
                  title={activity.activityTitle}
                  subtitle={`${activity.groupTitle} · ${formatDuration(activity.duration)}`}
                  onAction={() => openToki(activity.groupUuid)}
                />
              ))}
            </MenuBarExtra.Section>
          ))
        : recentActivities &&
          recentActivities.length > 0 && (
            <MenuBarExtra.Section title="Recent">
              {recentActivities.map((activity) => (
                <MenuBarExtra.Item
                  key={`${activity.groupUuid}-${activity.activityUuid}`}
                  title={activity.activityTitle}
                  subtitle={activity.groupTitle}
                  icon={Icon.Play}
                  onAction={() => handleStartTracking(activity)}
                />
              ))}
            </MenuBarExtra.Section>
          )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open Toki" icon={Icon.Clock} onAction={() => openToki()} />
    </MenuBarExtra>
  );
}
