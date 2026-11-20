import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCalendarStars, puzzleUrl } from "./lib/aoc";
import { formatDuration, isEventRunning, latestPuzzle, nextUnlock } from "./lib/calendar";

// Outside the event the countdown only appears in the last month before it starts
const SHOW_BEFORE_EVENT_MS = 30 * 24 * 60 * 60 * 1000;

export default function Command() {
  const now = new Date();
  const running = isEventRunning(now);
  const next = nextUnlock(now);
  const untilNext = next.at.getTime() - now.getTime();
  const current = latestPuzzle(now);

  const { data: stars, isLoading } = usePromise(getCalendarStars, [current.year], {
    execute: running,
    onError: () => undefined,
  });

  if (!running && untilNext > SHOW_BEFORE_EVENT_MS) return null;

  const todayStars = stars?.[current.day] ?? 0;
  const nextIsThisEvent = running && next.year === current.year;
  const title = running
    ? `Day ${current.day} ${"★".repeat(todayStars)}${"☆".repeat(2 - todayStars)}`
    : `AoC in ${formatDuration(untilNext)}`;

  return (
    <MenuBarExtra icon="extension-icon.png" title={title} isLoading={isLoading} tooltip="Advent of Code">
      {running && (
        <MenuBarExtra.Section title={`Advent of Code ${current.year}`}>
          <MenuBarExtra.Item
            title={`Open Day ${current.day}`}
            icon={Icon.Document}
            onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => open(puzzleUrl(current.year, current.day))}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={
            nextIsThisEvent || !running
              ? `Day ${next.day} unlocks in ${formatDuration(untilNext)}`
              : `Advent of Code ${next.year} starts in ${formatDuration(untilNext)}`
          }
          icon={Icon.Clock}
        />
        <MenuBarExtra.Item
          title="Private Leaderboard"
          icon={Icon.TwoPeople}
          onAction={() => launchCommand({ name: "leaderboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Browse Puzzles"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "browse", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
