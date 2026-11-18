import { MenuBarExtra, getPreferenceValues, open, openCommandPreferences, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getMatches,
  getMatchCenterUrl,
  matchesAroundToday,
  liveMatch,
  formatLine,
  menuBarTitle,
  goalsEnabled,
  setGoalsEnabled,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  type Match,
} from "./lib/worldcup";

const SCOREBOARD_URL = "https://www.espn.com/soccer/scoreboard";

/** "all" -> show every match (radius -1); otherwise the window radius in days around today. */
function windowRadius(): number {
  const value = getPreferenceValues<Preferences.Menubar>().daysToShow;
  if (value === "all") return -1;
  return Number(value) || 0;
}

export default function Command() {
  // useCachedPromise paints the last known scores instantly on cold start,
  // then revalidates against ESPN.
  const { data: matches = [], isLoading } = useCachedPromise(getMatches);

  // Cache the mute flag so the last known value paints instantly — no "goals
  // on" flash before the async read settles.
  const { data: goals = true, mutate: mutateGoals } = useCachedPromise(goalsEnabled);

  // The title tracks the live match regardless of the dropdown window (a live
  // match is always today, so it's always in range anyway).
  const live = liveMatch(matches);
  const title = live ? menuBarTitle(live) : undefined;

  const radius = windowRadius();
  const visible = matchesAroundToday(matches, radius);

  async function toggleGoals() {
    const next = !goals;
    await mutateGoals(setGoalsEnabled(next), { optimisticUpdate: () => next });
    // The menu closes on click, so confirm the new state with a HUD.
    await showHUD(next ? "🔔 Goal alerts on" : "🔕 Goal alerts muted");
  }

  return (
    <MenuBarExtra icon={live ? undefined : "⚽"} title={title} isLoading={isLoading} tooltip="World Cup">
      {visible.length === 0 && <MenuBarExtra.Item title={radius === 0 ? "No fixtures today" : "No fixtures"} />}

      <Section heading="Live" matches={visible.filter(isLiveMatch)} />
      <Section heading="Upcoming" matches={visible.filter(isUpcomingMatch)} />
      <Section heading="Finished" matches={visible.filter(isFinishedMatch)} />

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={goals ? "🔕" : "🔔"}
          title={goals ? "Mute Goal Alerts" : "Unmute Goal Alerts"}
          onAction={toggleGoals}
        />
        <MenuBarExtra.Item
          title="Open ESPN Scoreboard"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(SCOREBOARD_URL)}
        />
        <MenuBarExtra.Item
          title="Configure…"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function Section({ heading, matches }: { heading: string; matches: Match[] }) {
  if (matches.length === 0) return null;
  return (
    <MenuBarExtra.Section title={heading}>
      {matches.map((m) => (
        <MenuBarExtra.Item key={m.IdMatch} title={formatLine(m)} onAction={() => open(getMatchCenterUrl(m))} />
      ))}
    </MenuBarExtra.Section>
  );
}
