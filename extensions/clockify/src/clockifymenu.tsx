import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  addNewTimeEntry,
  cacheActiveTimeEntry,
  fetchActiveTimeEntry,
  getAllTimeEntriesFromLocalStorage,
  getCachedActiveTimeEntry,
  getElapsedTime,
  getTimeEntries,
  getTodayTotalTimeForProject,
  isInProgress,
  millisecondsToDurationString,
  notifyFailure,
  stopCurrentTimer,
  timeEntriesCacheAge,
  toMonospaceFont,
} from "./utils";
import { TimeEntry } from "./types";

// We have to use this as too many states changes seem to cancel the timer before 10 seconds (the min interval) elapsed
class DataWrapper {
  public currentEntry: TimeEntry | null = null;
  public currentlyElapsedTime: string | null = null;
  // Whether we have finished establishing what the running timer is, whether from the API or by
  // failing to reach it. Until then currentEntry is only the cache's guess, and the cache can be
  // stale in both directions — it misses a timer started in the web app, and it keeps showing one
  // stopped there — so an unsettled `null` means "don't know yet", not "nothing is running".
  //
  // Note this is "settled", not "confirmed by the API": a failed refresh still settles, so that one
  // unreachable request cannot also suppress the unrelated ones that depend on this.
  public settled = false;
}

/**
 * How stale the restart list may get before the menu bar pays to refresh it.
 *
 * Refreshing means a 500-entry hydrated request — about 1.2MB and three seconds — and this command is
 * re-invoked every 10 seconds, so refreshing every time cost in the order of 450MB an hour while no
 * timer was even running, all to populate a five-item list.
 *
 * These are templates to restart from rather than live data, and the only thing that adds one is
 * completing an entry with a project/task/description combination that is not already in the list.
 * Stopping a timer from this extension writes that into the cache directly, so the staleness here
 * only affects entries created entirely outside it, and the list is seeded from cache meanwhile.
 */
const RESTART_LIST_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Up to five distinct entries to restart from, newest first.
 *
 * These are templates rather than history, so entries are deduplicated on the same tuple
 * getTimeEntries() uses, and any running timer is excluded — offering to "restart" the timer that is
 * already running is meaningless.
 */
function toRestartTemplates(entries: TimeEntry[]): TimeEntry[] {
  const templates: TimeEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.projectId) continue;
    if (isInProgress(entry)) continue;

    const key = `${entry.description || ""}-${entry.projectId}-${entry.taskId || ""}`;
    if (seen.has(key)) continue;

    seen.add(key);
    templates.push(entry);
    if (templates.length >= 5) break;
  }

  return templates;
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
      settled: false,
    };
  });
  // Seeded from the cached entries list for the same reason as currentData: the refresh that would
  // populate this fetches 500 hydrated entries and takes seconds, so waiting for it left the list
  // blank — most visibly right after stopping a timer, which is exactly when it is wanted.
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>(() =>
    toRestartTemplates(getAllTimeEntriesFromLocalStorage()),
  );
  const [todayTotal, setTodayTotal] = useState<number>(0);

  // Bumped whenever this command changes the timer itself. A refresh that was issued before such a
  // change describes the world as it was beforehand, so applying its answer afterwards would
  // resurrect a timer the user has just stopped. Comparing generations discards those answers.
  const generation = useRef(0);

  const handleStopTimer = async () => {
    try {
      await stopCurrentTimer(() => {
        generation.current++;
        // Settled-empty rather than null: we know the timer is gone, so the recent-entries effect
        // below should run instead of waiting for the next invocation to work it out.
        setCurrentData({ currentEntry: null, currentlyElapsedTime: null, settled: true });

        // Re-seed from the cache, which stopCurrentTimer has just amended to mark this entry ended.
        // The list was built at mount, when this timer was still running and so excluded from it, and
        // the effect below will not refetch while the cache is still fresh — without this the entry
        // just stopped would be missing from the restart list until the next invocation.
        setRecentEntries(toRestartTemplates(getAllTimeEntriesFromLocalStorage()));
      });
    } catch (error) {
      notifyFailure(error, "Could not stop timer");
    }
  };

  const handleRestartTimer = async (entry: TimeEntry) => {
    try {
      const newEntry = await addNewTimeEntry(entry.description, entry.projectId, entry.taskId, [], new Date());

      if (newEntry) {
        generation.current++;

        // Re-read the running timer to get hydrated data with full project info
        const activeEntry = await fetchActiveTimeEntry();
        if (activeEntry) {
          cacheActiveTimeEntry(activeEntry);
          setCurrentData({
            currentEntry: activeEntry,
            currentlyElapsedTime: getElapsedTime(activeEntry),
            settled: true,
          });
        }
      }
    } catch (error) {
      notifyFailure(error, "Could not restart timer");
    }
  };

  // Correct the cached seed above from the API. The cache is only a guess: it cannot see a timer
  // started or stopped outside this extension.
  useEffect(() => {
    const issuedAt = generation.current;

    fetchActiveTimeEntry().then((entry) => {
      // Superseded by a stop or restart performed while this was in flight. Drop it entirely,
      // including the cache write, so it cannot resurrect the old timer here or in the next process.
      if (generation.current !== issuedAt) return;

      // undefined means the request failed. Keep showing the cached guess rather than claiming there
      // is no timer, but still settle: the supporting data below is fetched separately and may well
      // succeed, and withholding it would show a timer with a zeroed daily total.
      if (entry === undefined) {
        setCurrentData((prev) => ({
          currentEntry: prev?.currentEntry ?? null,
          currentlyElapsedTime: prev?.currentlyElapsedTime ?? null,
          settled: true,
        }));
        return;
      }

      cacheActiveTimeEntry(entry);

      // Always applied, even when it matches the seed, because `settled` flipping to true is what
      // releases the effect below. When the seed was already right this re-renders with identical
      // values, which is not visible — the flash was the seed being absent, not this correction.
      setCurrentData({
        currentEntry: entry,
        currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
        settled: true,
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
          // Only fall back to the cache while the entry is unsettled. Once the API has answered,
          // re-reading the cache would undo it — that read is what used to make an externally
          // started timer flap back to "No Timer" a second after appearing.
          const entry = prev?.settled ? prev.currentEntry : getCachedActiveTimeEntry();
          return {
            currentEntry: entry,
            currentlyElapsedTime: entry ? getElapsedTime(entry) : null,
            settled: prev?.settled ?? false,
          };
        });
      } else {
        setCurrentData((prev) => ({
          currentEntry: prev?.currentEntry || null,
          currentlyElapsedTime: prev?.currentEntry ? getElapsedTime(prev.currentEntry) : null,
          settled: prev?.settled ?? false,
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentData?.currentEntry?.timeInterval?.start]);

  const currentEntry = currentData?.currentEntry;
  const currentlyElapsedTime = currentData?.currentlyElapsedTime;
  const settled = currentData?.settled ?? false;

  // Fetch recent entries when there's no active timer, or today's total when there is.
  //
  // Waiting for `settled` matters for more than correctness. This effect used to run while
  // currentData was still null, which is indistinguishable from "no timer", so every invocation
  // started a 1.2MB recent-entries fetch that its own cleanup then usually — but not always —
  // cancelled a few milliseconds later. Which of those won was a race, so whether the extension
  // noticed an externally changed timer varied run to run.
  //
  // Uses setTimeout to defer data fetching and allow the menu to render first
  useEffect(() => {
    if (!settled) return;

    const timeoutId = setTimeout(() => {
      if (currentEntry?.projectId) {
        // Active timer: show today's total for this project.
        //
        // The recent entries are deliberately left alone. They are only rendered when no timer is
        // running, so clearing them here is invisible — and it used to leave the list blank for the
        // seconds after a timer was stopped, until the refresh below caught up.
        getTodayTotalTimeForProject(currentEntry.projectId).then(setTodayTotal);
      } else if (!currentEntry) {
        // No active timer: refresh the recent entries seeded above, but only once they are stale
        // enough to be worth the request. See RESTART_LIST_MAX_AGE_MS.
        if (timeEntriesCacheAge() < RESTART_LIST_MAX_AGE_MS) {
          setTodayTotal(0);
          return;
        }

        getTimeEntries({})
          .then((allEntries) => {
            setRecentEntries(toRestartTemplates(allEntries));
            setTodayTotal(0);
          })
          .catch((error) => {
            notifyFailure(error, "Could not load recent entries");
          });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [settled, currentEntry?.projectId]);

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
