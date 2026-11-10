import { Color, Icon, List } from "@raycast/api";
import { petMarkdown } from "../art";
import { ACHIEVEMENTS, loggedItems } from "../engine/collection";
import { BUILDINGS, ITEMS, PETS, SKILL_BY_ID, TASKS } from "../engine/data";
import { formatNumber } from "../engine/format";
import { GameState, ItemId, SkillId } from "../engine/types";

const found = <T,>(done: boolean, hit: T, miss: T) => (done ? hit : miss);
const note = (markdown: string) => <List.Item.Detail markdown={markdown} />;
const check = (done: boolean): List.Item.Props["icon"] =>
  done ? Icon.CheckCircle : { source: Icon.Circle, tintColor: Color.SecondaryText };

export function Collection({ state, frame }: { state: GameState; frame: number }) {
  const logged = new Set(loggedItems(state));
  const items = Object.keys(ITEMS) as ItemId[];
  const creatures = TASKS.filter((t) => t.monster);
  const pets = Object.keys(PETS) as SkillId[];
  return (
    <>
      <List.Section title="Achievements" subtitle={`${state.achievements.length}/${ACHIEVEMENTS.length}`}>
        {ACHIEVEMENTS.map((a) => {
          const done = state.achievements.includes(a.id);
          return (
            <List.Item
              key={a.id}
              title={a.name}
              subtitle={a.description}
              icon={check(done)}
              detail={note(`# ${a.name}\n${a.description}\n\nReward: **${formatNumber(a.reward)} cr**`)}
            />
          );
        })}
      </List.Section>
      <List.Section title="Pets" subtitle={`${state.pets.length}/${pets.length}`}>
        {pets.map((skill) => {
          const done = state.pets.includes(skill);
          return (
            <List.Item
              key={skill}
              title={found(done, PETS[skill]!.name, "???")}
              subtitle={found(done, PETS[skill]!.blurb, `A rare find while ${SKILL_BY_ID[skill].name.toLowerCase()}`)}
              icon={check(done)}
              detail={
                <List.Item.Detail
                  markdown={
                    done
                      ? `${petMarkdown(skill, frame, true)}\n\n# ${PETS[skill]!.name}\n${PETS[skill]!.blurb}\n\n+3% ${SKILL_BY_ID[skill].name} XP while it stays with you. A launch sends it home.`
                      : `# ???\nA pet turns up now and then while you work in ${SKILL_BY_ID[skill].name}. About one task in ten thousand.`
                  }
                />
              }
            />
          );
        })}
      </List.Section>
      <List.Section
        title="Creatures"
        subtitle={`${creatures.filter((t) => state.stats.hunts[t.id]).length}/${creatures.length}`}
      >
        {creatures.map((t) => {
          const kills = state.stats.hunts[t.id] ?? 0;
          return (
            <List.Item
              key={t.id}
              title={found(kills > 0, t.monster!.name, "???")}
              icon={check(kills > 0)}
              detail={note(kills > 0 ? `# ${t.monster!.name}\nDefeated ×${formatNumber(kills)}` : "# ???")}
            />
          );
        })}
      </List.Section>
      <List.Section
        title="Buildings"
        subtitle={`${BUILDINGS.filter((b) => state.buildings[b.id]).length}/${BUILDINGS.length}`}
      >
        {BUILDINGS.map((b) => {
          const level = state.buildings[b.id] ?? 0;
          return (
            <List.Item
              key={b.id}
              title={found(level > 0, b.name, "???")}
              icon={check(level > 0)}
              detail={note(level > 0 ? `# ${b.name}\nLevel ${level}` : "# ???")}
            />
          );
        })}
      </List.Section>
      <List.Section title="Items" subtitle={`${logged.size}/${items.length}`}>
        {items.map((id) => (
          <List.Item
            key={id}
            title={found(logged.has(id), ITEMS[id].name, "???")}
            icon={check(logged.has(id))}
            detail={note(
              logged.has(id)
                ? `# ${ITEMS[id].name}\nGained ×${formatNumber(state.stats.produced[id] ?? 0)}`
                : "# ???",
            )}
          />
        ))}
      </List.Section>
    </>
  );
}
