import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addNewTimeEntry,
  fetchActiveTimeEntry,
  getCachedActiveTimeEntry,
  getElapsedTime,
  getTimeEntries,
  getTodayTotalTimeForProject,
  isInProgress,
  millisecondsToDurationString,
  notifyFailure,
  stopCurrentTimer,
  toMonospaceFont,
} from "./utils";
import { TimeEntry } from "./types";

// We have to use this as too many states changes seem to cancel the timer before 10 seconds (the min interval) elapsed
class DataWrapper {
  public currentEntry: TimeEntry | null = null;
  public currentlyElapsedTime: string | null = null;
  // Whether currentEntry came from the API rather than the cache. The cache can be stale in both
  // directions — it misses a timer started in the web app, and it keeps showing one stopped there —
  // so an unconfirmed `null` means "don't know yet", not "nothing is running".
  public confirmed = false;
}

export default function ClockifyMenuCommand() {
  // Seed from the cache in the initializer, not in an effect.
  //
  // This runs in a fresh process every 10 seconds, so starting from null meant the first frame of
  // every invocation rendered "No Timer" and was corrected a few milliseconds later — a visible
  // flash in the menu bar on a 10-second cycle, even while a timer ran uninterrupted. The read is a
  // synchronous cache hit that swallows its own errors, so it is safe here.
  const [currentData, setCurrentData] = useState<DataWrapper | null>(() => {
    const cached = getCachedActiveTimeEntry();
    return {
      currentEntry: cached,
      currentlyElapsedTime: cached ? getElapsedTime(cached) : null,
      confirmed: false,
    };
  });
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [todayTotal, setTodayTotal] = useState<number>(0);

  const handleStopTimer = async () => {
    try {
      // Confirmed-empty rather than null: we know the timer is gone, so the recent-entries effect
      // below should run instead of waiting for the next invocation to work it out.
      await stopCurrentTimer(() => setCurrentData({ currentEntry: null, currentlyElapsedTime: null, confirmed: true }));
    } catch (error) {
      notifyFailure(error, "Could not stop timer");
    }
  };

  const handleRestartTimer = async (entry: TimeEntry) => {
    try {
      const newEntry = await addNewTimeEntry(entry.description, entry.projectId, entry.taskId, [], new Date());

      if (newEntry) {
        // Re-read the running timer to get hydrated data with full project info
        const activeEntry = await fetchActiveTimeEntry();
        if (activeEntry) {
          setCurrentData({
            currentEntry: activeEntry,
            currentlyElapsedTime: getElapsedTime(activeEntry),
            confirmed: true,
          });
        }
        setRecentEntries([]);
      }
    } catch (error) {
      notifyFailure(error, "Could not restart timer");
    }
  };

  // Correct the cached seed above from the API. The cache is only a guess: it cannot see a timer
  // started or stopped outside this extension.
  useEffect(() => {
    fetchActiveTimeEntry().then((entry) => {
      // undefined means the request failed — keep showing the cached guess rather than claiming
      // there is no timer.
      if (entry === undefined) return;

      // Always applied, even when it matches the seed, because `confirmed` flipping to true is what
      // releases the effect below. When the seed was already right this re-renders with identical
      // values, which is not visible — the flash was the seed being absent, not this correction.
      setCurrentData({
        currentEntry: entry,
        currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
        confirmed: true,
      });
    });
  }, []);

  // Setup interval to update elapsed time when timer is running
  useEffect(() => {
    if (!currentData?.currentEntry?.timeInterval?.start) return;

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      // Trickery - else the component gets reset before the 10s interval is reached. What keeps the
      // process alive is producing a new object every second, which both branches still do.
      if (counter % 2 === 0) {
        setCurrentData((prev) => {
          // Only fall back to the cache while the entry is unconfirmed. Once the API has answered,
          // re-reading the cache would undo it — that read is what used to make an externally
          // started timer flap back to "No Timer" a second after appearing.
          const entry = prev?.confirmed ? prev.currentEntry : getCachedActiveTimeEntry();
          return {
            currentEntry: entry,
            currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
            confirmed: prev?.confirmed ?? false,
          };
        });
      } else {
        setCurrentData((prev) => ({
          currentEntry: prev?.currentEntry || null,
          currentlyElapsedTime: prev?.currentEntry ? getElapsedTime(prev.currentEntry) : null,
          confirmed: prev?.confirmed ?? false,
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentData?.currentEntry?.timeInterval?.start]);

  const currentEntry = currentData?.currentEntry;
  const currentlyElapsedTime = currentData?.currentlyElapsedTime;
  const confirmed = currentData?.confirmed ?? false;

  // Fetch recent entries when there's no active timer, or today's total when there is.
  //
  // Waiting for `confirmed` matters for more than correctness. This effect used to run while
  // currentData was still null, which is indistinguishable from "no timer", so every invocation
  // started a 1.2MB recent-entries fetch that its own cleanup then usually — but not always —
  // cancelled a few milliseconds later. Which of those won was a race, so whether the extension
  // noticed an externally changed timer varied run to run.
  //
  // Uses setTimeout to defer data fetching and allow the menu to render first
  useEffect(() => {
    if (!confirmed) return;

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
              // Never offer a running timer as something to restart. Shouldn't happen now that this
              // branch requires a confirmed-empty state, but the list is fetched separately and a
              // timer can start between the two requests.
              if (isInProgress(e)) continue;
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
            notifyFailure(error, "Could not load recent entries");
          });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [confirmed, currentEntry?.projectId]);

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
