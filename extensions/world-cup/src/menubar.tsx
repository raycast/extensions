import { MenuBarExtra, open, openCommandPreferences, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getMatches,
  liveMatch,
  formatLine,
  menuBarTitle,
  goalsEnabled,
  setGoalsEnabled,
  type Match,
} from "./lib/worldcup";

const SCOREBOARD_URL = "https://www.espn.com/soccer/scoreboard";

export default function Command() {
  // useCachedPromise paints the last known scores instantly on cold start,
  // then revalidates against ESPN.
  const { data: matches = [], isLoading } = useCachedPromise(getMatches);

  // Cache the mute flag so the last known value paints instantly — no "goals
  // on" flash before the async read settles.
  const { data: goals = true, mutate: mutateGoals } = useCachedPromise(goalsEnabled);

  const live = liveMatch(matches);
  const title = live ? menuBarTitle(live) : undefined;

  async function toggleGoals() {
    const next = !goals;
    await mutateGoals(setGoalsEnabled(next), { optimisticUpdate: () => next });
    // The menu closes on click, so confirm the new state with a HUD.
    await showHUD(next ? "🔔 Goal alerts on" : "🔕 Goal alerts muted");
  }

  return (
    <MenuBarExtra icon={live ? undefined : "⚽"} title={title} isLoading={isLoading} tooltip="World Cup">
      {matches.length === 0 && <MenuBarExtra.Item title="No fixtures today" />}

      <Section heading="Live" matches={matches.filter((m) => m.state === "in")} />
      <Section heading="Upcoming" matches={matches.filter((m) => m.state === "pre")} />
      <Section heading="Finished" matches={matches.filter((m) => m.state === "post")} />

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
        <MenuBarExtra.Item key={m.id} title={formatLine(m)} onAction={() => open(SCOREBOARD_URL)} />
      ))}
    </MenuBarExtra.Section>
  );
}
