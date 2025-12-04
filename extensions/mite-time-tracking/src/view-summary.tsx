import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  getTodayTimeEntries,
  getThisWeekTimeEntries,
} from "./api/time-entries";
import {
  getTracker,
  isTrackerRunning,
  calculateElapsedMinutes,
  stopTracker,
  startTracker,
} from "./api/tracker";
import { formatMinutesToHours } from "./utils/validation";
import { getMiteDailyUrl } from "./utils/mite-url";
import {
  getFavoriteProjectIds,
  toggleFavoriteProject,
  isFavoriteProject,
} from "./utils/favorites";
import StartEntry from "./start-timer";
import type { MiteTimeEntry, MiteTracker } from "./api/types";

export default function ViewSummary() {
  const [entries, setEntries] = useState<MiteTimeEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<MiteTimeEntry[]>([]);
  const [tracker, setTracker] = useState<MiteTracker | null>(null);
  const [activeEntry, setActiveEntry] = useState<MiteTimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [favoriteProjectIds, setFavoriteProjectIds] = useState<number[]>([]);

  async function loadData() {
    try {
      setIsLoading(true);

      // Load tracker, today and week entries, and favorites in parallel
      const [trackerData, entriesData, weekEntriesData, favorites] =
        await Promise.all([
          getTracker(),
          getTodayTimeEntries(),
          getThisWeekTimeEntries(),
          getFavoriteProjectIds(),
        ]);

      setTracker(trackerData);
      setWeekEntries(weekEntriesData);
      setFavoriteProjectIds(favorites);

      // If tracker is running, get the active entry details
      if (isTrackerRunning(trackerData) && trackerData.tracking_time_entry) {
        const activeEntryData = entriesData.find(
          (e) => e.id === trackerData.tracking_time_entry!.id,
        );
        setActiveEntry(activeEntryData || null);
        setElapsedMinutes(calculateElapsedMinutes(trackerData));
      } else {
        setActiveEntry(null);
      }

      setEntries(entriesData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Update elapsed time every 30 seconds when timer is running
  useEffect(() => {
    if (!tracker || !isTrackerRunning(tracker)) return;

    const interval = setInterval(() => {
      setElapsedMinutes(calculateElapsedMinutes(tracker));
    }, 30000);

    return () => clearInterval(interval);
  }, [tracker]);

  async function handleStop() {
    if (!tracker?.tracking_time_entry) return;

    try {
      await stopTracker(tracker.tracking_time_entry.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
      });
      await loadData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Stop",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleRestartEntry(entry: MiteTimeEntry) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Timer...",
      });

      await startTracker(entry.id);

      const projectInfo = entry.project_name
        ? `${entry.customer_name} - ${entry.project_name}`
        : "Project";

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: projectInfo,
      });

      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleToggleFavorite(entry: MiteTimeEntry) {
    if (!entry.project_id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Project",
        message: "This entry has no project",
      });
      return;
    }

    try {
      const wasAdded = await toggleFavoriteProject(entry.project_id);
      const projectName = entry.project_name
        ? `${entry.customer_name} - ${entry.project_name}`
        : "Project";

      await showToast({
        style: Toast.Style.Success,
        title: wasAdded ? "Added to Favorites" : "Removed from Favorites",
        message: projectName,
      });

      // Reload favorites
      const favorites = await getFavoriteProjectIds();
      setFavoriteProjectIds(favorites);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Calculate total time tracked today
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const totalTime = formatMinutesToHours(totalMinutes);

  // Calculate total time tracked this week
  const weekTotalMinutes = weekEntries.reduce(
    (sum, entry) => sum + entry.minutes,
    0,
  );
  const weekTotalTime = formatMinutesToHours(weekTotalMinutes);

  // Count entries with issues (missing note or non-billable)
  const weekIssuesCount = weekEntries.filter((entry) => {
    const hasNoNote = !entry.note || entry.note.trim().length === 0;
    const isNonBillable = entry.billable === false;
    return hasNoNote || isNonBillable;
  }).length;

  const hasActiveEntry = tracker && isTrackerRunning(tracker) && activeEntry;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Time Entries"
      searchBarPlaceholder="Search entries..."
    >
      {hasActiveEntry && (
        <List.Section title="Active Entry">
          <List.Item
            title={activeEntry.note || "No description"}
            subtitle={
              activeEntry.project_name
                ? `${activeEntry.customer_name} - ${activeEntry.project_name}`
                : "No project"
            }
            icon={{ source: Icon.Circle, tintColor: Color.Green }}
            keywords={[
              activeEntry.customer_name || "",
              activeEntry.project_name || "",
              activeEntry.service_name || "",
            ]}
            accessories={[
              ...(isFavoriteProject(activeEntry.project_id, favoriteProjectIds)
                ? [{ icon: Icon.Star }]
                : []),
              {
                text: activeEntry.service_name || "No service",
                icon: Icon.Tag,
              },
              {
                text: formatMinutesToHours(elapsedMinutes),
                icon: { source: Icon.Clock, tintColor: Color.Green },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Stop Timer"
                    icon={Icon.Stop}
                    onAction={handleStop}
                  />
                  <Action
                    title={
                      isFavoriteProject(
                        activeEntry.project_id,
                        favoriteProjectIds,
                      )
                        ? "Remove from Favorites"
                        : "Add to Favorites"
                    }
                    icon={
                      isFavoriteProject(
                        activeEntry.project_id,
                        favoriteProjectIds,
                      )
                        ? Icon.StarDisabled
                        : Icon.Star
                    }
                    onAction={() => handleToggleFavorite(activeEntry)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadData}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Create New Entry"
                    icon={Icon.Plus}
                    target={<StartEntry />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={getMiteDailyUrl()}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Entries Today"
          description="Start your first time entry with 'Start Timer'"
        />
      ) : (
        <List.Section title={`Today - ${totalTime} tracked`}>
          {entries.map((entry) => {
            const projectInfo = entry.project_name
              ? `${entry.customer_name} - ${entry.project_name}`
              : "No project";
            const duration = formatMinutesToHours(entry.minutes);
            const isActive = hasActiveEntry && entry.id === activeEntry.id;

            const accessories = [
              ...(isFavoriteProject(entry.project_id, favoriteProjectIds)
                ? [{ icon: Icon.Star }]
                : []),
              { text: entry.service_name || "No service", icon: Icon.Tag },
              { text: duration, icon: Icon.Clock },
            ];

            return (
              <List.Item
                key={entry.id}
                title={entry.note || "No description"}
                subtitle={projectInfo}
                icon={
                  isActive
                    ? { source: Icon.Circle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: Color.SecondaryText }
                }
                keywords={[
                  entry.customer_name || "",
                  entry.project_name || "",
                  entry.service_name || "",
                ]}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {isActive ? (
                        <Action
                          title="Stop Timer"
                          icon={Icon.Stop}
                          onAction={handleStop}
                        />
                      ) : (
                        <Action
                          title="Start Timer"
                          icon={Icon.Play}
                          onAction={() => handleRestartEntry(entry)}
                        />
                      )}
                      <Action
                        title={
                          isFavoriteProject(
                            entry.project_id,
                            favoriteProjectIds,
                          )
                            ? "Remove from Favorites"
                            : "Add to Favorites"
                        }
                        icon={
                          isFavoriteProject(
                            entry.project_id,
                            favoriteProjectIds,
                          )
                            ? Icon.StarDisabled
                            : Icon.Star
                        }
                        onAction={() => handleToggleFavorite(entry)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={loadData}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Create New Entry"
                        icon={Icon.Plus}
                        target={<StartEntry />}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={getMiteDailyUrl()}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      <List.Section
        title={`Week - ${weekTotalTime} tracked${weekIssuesCount > 0 ? ` (${weekIssuesCount} with issues)` : ""}`}
      >
        {weekEntries.map((entry) => {
          const projectInfo = entry.project_name
            ? `${entry.customer_name} - ${entry.project_name}`
            : "No project";
          const duration = formatMinutesToHours(entry.minutes);
          const hasIssue =
            !entry.note ||
            entry.note.trim().length === 0 ||
            entry.billable === false;

          // Format date for display (e.g., "Mon, 04 Dec")
          const entryDate = new Date(entry.date_at);
          const dateStr = entryDate.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          });

          return (
            <List.Item
              key={entry.id}
              title={entry.note || "No description"}
              subtitle={projectInfo}
              icon={
                hasIssue
                  ? { source: Icon.ExclamationMark, tintColor: Color.Yellow }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              keywords={[
                entry.customer_name || "",
                entry.project_name || "",
                entry.service_name || "",
              ]}
              accessories={[
                ...(isFavoriteProject(entry.project_id, favoriteProjectIds)
                  ? [{ icon: Icon.Star }]
                  : []),
                { text: dateStr, icon: Icon.Calendar },
                { text: entry.service_name || "No service", icon: Icon.Tag },
                { text: duration, icon: Icon.Clock },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Edit in Browser"
                      icon={Icon.Pencil}
                      url={getMiteDailyUrl(entry.id, entry.date_at)}
                    />
                    <Action
                      title={
                        isFavoriteProject(entry.project_id, favoriteProjectIds)
                          ? "Remove from Favorites"
                          : "Add to Favorites"
                      }
                      icon={
                        isFavoriteProject(entry.project_id, favoriteProjectIds)
                          ? Icon.StarDisabled
                          : Icon.Star
                      }
                      onAction={() => handleToggleFavorite(entry)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={loadData}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Create New Entry"
                      icon={Icon.Plus}
                      target={<StartEntry />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={getMiteDailyUrl()}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
