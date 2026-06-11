import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  addNewTimeEntry,
  getCurrentlyActiveTimeEntry,
  getElapsedTime,
  getTimeEntries,
  getTodayTotalTimeForProject,
  isInProgress,
  millisecondsToDurationString,
  stopCurrentTimer,
  toMonospaceFont,
} from "./utils";
import { TimeEntry } from "./types";

// We have to use this as too many states changes seem to cancel the timer before 10 seconds (the min interval) elapsed
class DataWrapper {
  public currentEntry: TimeEntry | null = null;
  public currentlyElapsedTime: string | null = null;
}

export default function ClockifyMenuCommand() {
  const [currentData, setCurrentData] = useState<DataWrapper | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [todayTotal, setTodayTotal] = useState<number>(0);

  const handleStopTimer = async () => {
    try {
      await stopCurrentTimer(() => setCurrentData(null));
    } catch (error) {
      showFailureToast(error, { title: "Could not stop timer" });
    }
  };

  const handleRestartTimer = async (entry: TimeEntry) => {
    try {
      const newEntry = await addNewTimeEntry(entry.description, entry.projectId, entry.taskId, [], new Date());

      if (newEntry) {
        // Refresh time entries to get hydrated data with full project info
        const freshEntries = await getTimeEntries({});
        const activeEntry = freshEntries.find((e) => isInProgress(e));
        if (activeEntry) {
          setCurrentData({
            currentEntry: activeEntry,
            currentlyElapsedTime: getElapsedTime(activeEntry),
          });
        }
        setRecentEntries([]);
      }
    } catch (error) {
      showFailureToast(error, { title: "Could not restart timer" });
    }
  };

  useEffect(() => {
    const entry = getCurrentlyActiveTimeEntry();
    setCurrentData({
      currentEntry: entry,
      currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
    });
  }, []);

  // Setup interval to update elapsed time when timer is running
  useEffect(() => {
    if (!currentData?.currentEntry?.timeInterval?.start) return;

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      // Trickery - else the component gets reset before the 10s interval is reached
      if (counter % 2 === 0) {
        const entry = getCurrentlyActiveTimeEntry();
        setCurrentData({
          currentEntry: entry,
          currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
        });
      } else {
        setCurrentData((prev) => ({
          currentEntry: prev?.currentEntry || null,
          currentlyElapsedTime: prev?.currentEntry ? getElapsedTime(prev.currentEntry) : null,
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentData?.currentEntry?.timeInterval?.start]);

  const currentEntry = currentData?.currentEntry;
  const currentlyElapsedTime = currentData?.currentlyElapsedTime;

  // Fetch recent entries when there's no active timer, or today's total when there is
  // Note: This effect runs on mount and whenever the active entry's project changes
  // Uses setTimeout to defer data fetching and allow the menu to render first
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentEntry?.projectId) {
        // Active timer: show today's total for this project
        getTodayTotalTimeForProject(currentEntry.projectId).then((total) => {
          setTodayTotal(total);
          // Clear recent entries since we have an active timer
          setRecentEntries([]);
        });
      } else if (!currentEntry) {
        // No active timer: show recent entries
        getTimeEntries({})
          .then((allEntries) => {
            const uniqueEntries: TimeEntry[] = [];
            const seen = new Set<string>();

            for (const e of allEntries) {
              if (!e.projectId) continue;
              const key = `${e.description || ""}-${e.projectId}-${e.taskId || ""}`;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueEntries.push(e);
                if (uniqueEntries.length >= 5) break;
              }
            }

            setRecentEntries(uniqueEntries);
            setTodayTotal(0);
          })
          .catch((error) => {
            showFailureToast(error, { title: "Could not load recent entries" });
          });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [currentEntry?.projectId]);

  return (
    <MenuBarExtra
      title={currentlyElapsedTime ? toMonospaceFont(currentlyElapsedTime) : "No Timer"}
      icon={{ source: Icon.Clock, tintColor: currentEntry?.project?.color || Color.PrimaryText }}
      tooltip={
        currentEntry
          ? `${currentEntry.description || "No Description"} - ${currentEntry.project?.name || "No Project"}`
          : "No active timer"
      }
    >
      {currentEntry ? (
        <>
          {currentEntry.description && (
            <MenuBarExtra.Item
              title={currentEntry.description}
              icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
            />
          )}
          <MenuBarExtra.Item
            title={currentEntry.project?.name || "No Project"}
            icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
          />
          {currentEntry.project && (
            <MenuBarExtra.Item
              title={`--- ${millisecondsToDurationString(
                todayTotal +
                  (currentEntry.timeInterval.start
                    ? new Date().getTime() - new Date(currentEntry.timeInterval.start).getTime()
                    : 0),
              )} on ${currentEntry.project.name} today`}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            />
          )}
          {currentEntry.task && (
            <MenuBarExtra.Item
              title={currentEntry.task.name}
              icon={{ source: Icon.Dot, tintColor: currentEntry.project?.color }}
            />
          )}
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title="Stop Timer" icon={Icon.Stop} onAction={handleStopTimer} />
          <MenuBarExtra.Item
            title="Open Clockify Website"
            icon={Icon.Globe}
            onAction={() => open("https://app.clockify.me")}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Item title="No active timer" icon={Icon.Clock} />
          {recentEntries.length > 0 && (
            <>
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Recent Timers" />
              {recentEntries.map((entry, index) => (
                <MenuBarExtra.Item
                  key={`${entry.id}-${index}`}
                  title={entry.description || "No Description"}
                  subtitle={entry.project?.name}
                  icon={{ source: Icon.Clock, tintColor: entry.project?.color }}
                  onAction={() => handleRestartTimer(entry)}
                />
              ))}
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
