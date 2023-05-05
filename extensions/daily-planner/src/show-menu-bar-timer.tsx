import {
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useState } from "react";
import { CALENDAR_DB, getCalItemQuery, toEpochBasedDates } from "./api/calendar-sql";
import { timeTracker, timeTrackerErrorPref } from "./api/time-tracker";
import { endOfToday, formatDuration, formatInterval, now } from "./helpers/datetime";
import { shortcut } from "./helpers/shortcut";
import {
  cachePausedTimer,
  cacheRunningTimer,
  cacheBlocks,
  getCachedPausedTimer,
  getCachedRunningTimer,
  getCachedBlocks,
} from "./helpers/cache";
import useElapsedTime from "./hooks/useElapsedTime";
import { Block } from "./types";

interface Preferences {
  blockCalendar: string;
  hideTimerTitle: boolean;
}

const { blockCalendar, hideTimerTitle } = getPreferenceValues<Preferences>();

// An initializer function for `useState`.
const getRemainingBlocks = () => getCachedBlocks().filter(({ end }) => end > now.getTime());

const isEqual = (a: Block, b: Block) =>
  a.id === b.id && a.title === b.title && a.start === b.start && a.end === b.end && a.url === b.url;

const truncate = (text: string, maxLength: number) => {
  const ellipsis = text.length > maxLength ? "…" : "";
  return text.slice(0, maxLength).trim() + ellipsis;
};

async function showTimeTrackerErrorHUD() {
  await showHUD(
    `❌ "${timeTrackerErrorPref ?? ""}" is missing or invalid. Please update it in Raycast Settings and try again.`
  );
}

export default function RunningTimer() {
  const [runningTimer, setRunningTimer] = useState(getCachedRunningTimer);
  const [pausedTimer, setPausedTimer] = useState(getCachedPausedTimer);

  const runningTimerDuration = useElapsedTime(runningTimer?.start);
  const pausedTimerDuration = pausedTimer?.end ? pausedTimer.end - pausedTimer.start : undefined;
  const timerDuration = runningTimerDuration ?? pausedTimerDuration;

  const [blocks, setBlocks] = useState(getRemainingBlocks);
  const blocksSansTimer = blocks.filter(({ url }) => url !== (runningTimer?.url ?? pausedTimer?.url));

  const query = getCalItemQuery({
    calendars: [blockCalendar],
    interval: { start: now.getTime(), end: endOfToday.getTime() },
    blocksOnly: true,
  });

  const { isLoading, error } = useSQL<Block>(CALENDAR_DB, query, {
    onData(data) {
      // To avoid flickering, call `setBlocks()` only when necessary.
      const fetchedBlocks = data.map((event) => toEpochBasedDates(event));
      if (fetchedBlocks.length !== blocks.length || fetchedBlocks.some((block, i) => !isEqual(block, blocks[i]))) {
        cacheBlocks(fetchedBlocks);
        setBlocks(fetchedBlocks);
      }
    },
  });

  async function stopTimer() {
    if (timeTracker === null) {
      await showTimeTrackerErrorHUD();
      return;
    }

    if (!runningTimer) {
      await showHUD("There is no running timer.");
      return;
    }

    try {
      await timeTracker.stopTimer(runningTimer);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
      await showHUD(`❌ ${error.message}`);
    }
    cacheRunningTimer(null);
    setRunningTimer(null);
  }

  async function pauseTimer() {
    if (!runningTimer) {
      await showHUD("There is no running timer.");
      return;
    }

    const pausedTimer = { ...runningTimer, end: Date.now() };
    await stopTimer();
    cachePausedTimer(pausedTimer);
    setPausedTimer(pausedTimer);
  }

  async function startTimer(url: Block["url"], title: Block["title"]) {
    if (timeTracker === null) {
      await showTimeTrackerErrorHUD();
      return;
    }

    // Project name/tags won't be synced (mentioned in documentation).
    const timeEntry = await timeTracker.startTimer(url, {
      description: title,
    });
    const cacheableTimeEntry = { ...timeEntry, url };
    cacheRunningTimer(cacheableTimeEntry);
    setRunningTimer(cacheableTimeEntry);
  }

  async function resumeTimer() {
    if (timeTracker === null) {
      await showTimeTrackerErrorHUD();
      return;
    }

    if (!pausedTimer) {
      await showHUD("There is no paused timer.");
      return;
    }

    const { title, start, end, url } = pausedTimer;
    const timeEntry = await timeTracker.startTimer(url, {
      description: title,
    });
    const cacheableTimeEntry = {
      ...timeEntry,
      start: end ? timeEntry.start - (end - start) : timeEntry.start,
      url,
    };
    cachePausedTimer(null);
    setPausedTimer(null);
    cacheRunningTimer(cacheableTimeEntry);
    setRunningTimer(cacheableTimeEntry);
  }

  /* eslint-disable @typescript-eslint/no-misused-promises */
  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={
        runningTimer
          ? Icon.Stopwatch
          : pausedTimer
          ? { source: { light: "light/pause-stopwatch.svg", dark: "dark/pause-stopwatch.svg" } }
          : { source: { light: "light/circle-dotted.svg", dark: "dark/circle-dotted.svg" } }
      }
      title={
        runningTimer
          ? (hideTimerTitle ? "" : truncate(runningTimer.title, 24) + " ") +
            formatDuration(Date.now() - runningTimer.start, { style: "shortUnits" })
          : ""
      }
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={runningTimer?.title ?? pausedTimer?.title ?? "No Running Timer"}
          subtitle={
            timerDuration
              ? formatDuration(timerDuration, {
                  style: "time",
                  showSeconds: true,
                })
              : undefined
          }
        />
        {runningTimer ? (
          <>
            <MenuBarExtra.Item
              icon={Icon.Stop}
              title="Stop Timer"
              shortcut={shortcut.stopTimer}
              onAction={() => stopTimer()}
            />

            <MenuBarExtra.Item
              icon={Icon.Pause}
              title="Pause Timer"
              shortcut={shortcut.pauseTimer}
              onAction={() => pauseTimer()}
            />
          </>
        ) : pausedTimer ? (
          <MenuBarExtra.Item
            icon={Icon.Play}
            title="Resume Timer"
            shortcut={shortcut.startTimer}
            onAction={() => resumeTimer()}
          />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section
        title={
          error?.message.includes("authorization denied")
            ? "Unable to Start Timer (Raycast needs access to Calendars)"
            : "Start Timer"
        }
      >
        {error?.message.includes("authorization denied") ? (
          <MenuBarExtra.Item
            title="Open System Settings > Privacy > Calendars"
            onAction={() =>
              void open("x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Calendars")
            }
          />
        ) : blocksSansTimer.length > 0 ? (
          blocksSansTimer.map(({ id, title, start, end, url }) => (
            <MenuBarExtra.Item
              key={id}
              icon={Icon.Play}
              title={title}
              subtitle={formatInterval({ start, end })}
              onAction={async () => await startTimer(url, title)}
            />
          ))
        ) : (
          <MenuBarExtra.Item title="No remaining blocks today" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All To-Dos"
          onAction={() => void launchCommand({ name: "track-time", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Settings..."
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => void openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
