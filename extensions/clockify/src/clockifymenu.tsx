import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  addNewTimeEntry,
  getCurrentlyActiveTimeEntry,
  getElapsedTime,
  getTimeEntries,
  getTodayTotalTimeForProject,
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
      await addNewTimeEntry(
        entry.description,
        entry.projectId,
        entry.taskId,
        () => {
          // Use the original entry data which has hydrated project/task info
          // Create a new entry object with updated timeInterval
          const restartedEntry: TimeEntry = {
            ...entry,
            id: Date.now().toString(), // Temporary ID until refresh
            timeInterval: {
              start: new Date().toISOString(),
              end: null,
            },
          };
          setCurrentData({
            currentEntry: restartedEntry,
            currentlyElapsedTime: getElapsedTime(restartedEntry),
          });
          setRecentEntries([]);
        },
        new Date(),
      );
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

    if (entry?.projectId) {
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
    }
  }, []);

  const currentEntry = currentData?.currentEntry;
  const currentlyElapsedTime = currentData?.currentlyElapsedTime;

  // Fetch data asynchronously without blocking render
  useEffect(() => {
    // Use setTimeout to ensure this runs after initial render
    const timeoutId = setTimeout(() => {
      if (currentEntry?.projectId) {
        getTodayTotalTimeForProject(currentEntry.projectId).then((total) => {
          setTodayTotal(total);
        });
      } else if (!currentEntry) {
        getTimeEntries({}).then((allEntries) => {
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
              )} total today`}
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
