import { Icon, List } from "@raycast/api";
import { ITEMS, SKILLS } from "../engine/data";
import { levelOf } from "../engine/engine";
import { formatCredits, formatDate, formatDuration } from "../engine/format";
import { GameState, ItemId } from "../engine/types";

export function Stats({ state }: { state: GameState }) {
  const produced = (Object.entries(state.stats.produced) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const rows: [string, string][] = [
    ["Stranded since", formatDate(state.createdAt)],
    ["Time stranded", formatDuration(state.lastTick - state.createdAt)],
    ["Tasks completed", state.stats.cycles.toLocaleString("en-US")],
    ["Creatures defeated", state.stats.kills.toLocaleString("en-US")],
    ["Retreats", state.stats.retreats.toLocaleString("en-US")],
    ["Credits earned", formatCredits(state.stats.creditsEarned)],
    ["Bounties completed", state.stats.bounties.toLocaleString("en-US")],
  ];

  return (
    <>
      <List.Section title="Lifetime">
        {rows.map(([title, value]) => (
          <List.Item
            key={title}
            title={title}
            icon={Icon.BarChart}
            accessories={[{ text: value }]}
          />
        ))}
      </List.Section>
      <List.Section title="Skills">
        {SKILLS.map((skill) => (
          <List.Item
            key={skill.id}
            title={skill.name}
            accessories={[
              { text: `${Math.floor(state.xp[skill.id]).toLocaleString("en-US")} XP` },
              { tag: `Lv ${levelOf(state, skill.id)}` },
            ]}
          />
        ))}
      </List.Section>
      <List.Section title="Gained in total">
        {produced.map(([id, n]) => (
          <List.Item
            key={id}
            title={ITEMS[id].name}
            icon={Icon.Box}
            accessories={[{ text: `×${Math.floor(n).toLocaleString("en-US")}` }]}
          />
        ))}
        {produced.length === 0 && <List.Item title="Nothing yet" icon={Icon.Box} />}
      </List.Section>
    </>
  );
}
