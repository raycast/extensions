import { Icon, List } from "@raycast/api";
import { ITEMS, SKILLS } from "../engine/data";
import { levelOf } from "../engine/engine";
import { formatCredits, formatDate, formatDuration, formatNumber } from "../engine/format";
import { GameState, ItemId } from "../engine/types";

export function Stats({ state }: { state: GameState }) {
  const produced = (Object.entries(state.stats.produced) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const rows: [string, string][] = [
    ["Stranded since", formatDate(state.createdAt)],
    ["Time stranded", formatDuration(state.lastTick - state.createdAt)],
    ["Launches", formatNumber(state.launches)],
    ["Tasks completed", formatNumber(state.stats.cycles)],
    ["Creatures defeated", formatNumber(state.stats.kills)],
    ["Retreats", formatNumber(state.stats.retreats)],
    ["Credits earned", formatCredits(state.stats.creditsEarned)],
    ["Bounties completed", formatNumber(state.stats.bounties)],
  ];

  return (
    <>
      <List.Section title="Lifetime">
        {rows.map(([title, value]) => (
          <List.Item key={title} title={title} icon={Icon.BarChart} accessories={[{ text: value }]} />
        ))}
      </List.Section>
      <List.Section title="Skills">
        {SKILLS.map((skill) => (
          <List.Item
            key={skill.id}
            title={skill.name}
            accessories={[
              { text: `${formatNumber(Math.floor(state.xp[skill.id]))} XP` },
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
            accessories={[{ text: `×${formatNumber(Math.floor(n))}` }]}
          />
        ))}
        {produced.length === 0 && <List.Item title="Nothing yet" icon={Icon.Box} />}
      </List.Section>
    </>
  );
}
