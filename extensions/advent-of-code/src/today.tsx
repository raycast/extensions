import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PuzzleDetail } from "./components/puzzle-detail";
import { formatDuration, isEventRunning, latestPuzzle, nextUnlock } from "./lib/calendar";

export default function Command() {
  const now = new Date();
  if (isEventRunning(now)) {
    const { year, day } = latestPuzzle(now);
    return <PuzzleDetail year={year} day={day} isRoot />;
  }

  // Outside December there's no puzzle of the day, so show the countdown and last year's final puzzle
  const next = nextUnlock(now);
  const last = latestPuzzle(now);
  const markdown = [
    "# Advent of Code 🎄",
    `The ${next.year} event starts in **${formatDuration(next.at.getTime() - now.getTime())}**.`,
    `The first puzzle unlocks on ${next.at.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}.`,
    `In the meantime, you can catch up on puzzles from ${last.year} and earlier with **Browse Puzzles**.`,
  ].join("\n\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title={`Open ${last.year} Day ${last.day}`}
            icon={Icon.Document}
            target={<PuzzleDetail year={last.year} day={last.day} />}
          />
          <Action.OpenInBrowser url="https://adventofcode.com" />
        </ActionPanel>
      }
    />
  );
}
