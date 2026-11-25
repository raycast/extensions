import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { PuzzleDetail } from "./components/puzzle-detail";
import { getCalendarStars, getYearStars, puzzleUrl } from "./lib/aoc";
import { latestYear, puzzleCount, unlockTime, unlockedDays, years } from "./lib/calendar";

export default function Command() {
  const [year, setYear] = useCachedState("browse-year", latestYear());
  const {
    data: stars,
    isLoading: loadingStars,
    revalidate: reloadStars,
  } = usePromise(getCalendarStars, [year], {
    failureToastOptions: { title: "Couldn't load your stars" },
  });
  const { data: yearStars, revalidate: reloadYearStars } = usePromise(getYearStars, [], {
    failureToastOptions: { title: "Couldn't load your events" },
  });

  function solved() {
    reloadStars();
    reloadYearStars();
  }

  const unlocked = unlockedDays(year);
  const locked = puzzleCount(year) - unlocked.length;

  return (
    <List
      isLoading={loadingStars}
      searchBarPlaceholder="Search days"
      searchBarAccessory={
        <List.Dropdown tooltip="Event" value={String(year)} onChange={(value) => setYear(Number(value))}>
          {years().map((y) => (
            <List.Dropdown.Item
              key={y}
              value={String(y)}
              title={yearStars?.[y] ? `${y}  ·  ${yearStars[y]}⭐` : String(y)}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={`${year}`} subtitle={locked > 0 ? `${locked} still locked` : undefined}>
        {[...unlocked].reverse().map((day) => {
          const dayStars = stars?.[day] ?? 0;
          return (
            <List.Item
              key={day}
              title={`Day ${day}`}
              icon={{ source: Icon.Star, tintColor: starColor(dayStars) }}
              accessories={[
                { text: dayStars === 0 ? undefined : "⭐".repeat(dayStars) },
                { date: unlockTime(year, day), tooltip: "Unlocked" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Read Puzzle"
                    icon={Icon.Document}
                    target={<PuzzleDetail year={year} day={day} onSolved={solved} />}
                  />
                  <Action.OpenInBrowser url={puzzleUrl(year, day)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function starColor(stars: number): Color {
  if (stars === 2) return Color.Yellow;
  if (stars === 1) return Color.SecondaryText;
  return Color.PrimaryText;
}
