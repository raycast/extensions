import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { buildingMarkdown } from "../art";
import { BUILDING_BY_ID, BUILDINGS, ITEMS, SKILL_BY_ID } from "../engine/data";
import {
  buildingCost,
  buildingCredits,
  buildingLevel,
  contactRemainingMs,
  count,
  firstContact,
  levelOf,
  powerCapacity,
  powerEfficiency,
  powerUsed,
} from "../engine/engine";
import { formatDuration } from "../engine/format";
import { BuildingDef, BuildingId, GameState, ItemId } from "../engine/types";

function effectLine(def: BuildingDef, level: number, state: GameState): string {
  if (def.id === "beacon") {
    if (!level) return "Not built";
    const wait = contactRemainingMs(state);
    return wait === null ? "The locals have answered" : `Signal sent, answer expected in ${formatDuration(wait)}`;
  }
  if (def.id === "shelter") return `+${10 * level} max HP, +${(0.15 * level).toFixed(2)} HP/s`;
  if (def.levelNotes) return level ? `Level ${level}: ${def.levelNotes[level - 1]}` : "Not built";
  if (def.id === "workshop") return `Engineering ${8 * level}% faster`;
  if (def.powerProvided) return `${def.powerProvided * level} power`;
  if (def.produces) {
    const eff = powerEfficiency(state);
    return `${level} × ${ITEMS[def.produces.item].name} per ${def.produces.everyMs / 1000}s${eff < 1 ? `, at ${Math.round(eff * 100)}% power` : ""}`;
  }
  return level ? "Built" : "Not built";
}

export function Base(props: { state: GameState; frame: number; onBuild: (id: BuildingId) => void }) {
  const { state } = props;
  const contact = firstContact(state);
  return (
    <List.Section title="Base" subtitle={`Power ${powerUsed(state)}/${powerCapacity(state)}`}>
      {BUILDINGS.map((def) => {
        const level = buildingLevel(state, def.id);
        const maxed = level >= def.maxLevel;
        const skillLocked = !!def.requires && levelOf(state, def.requires.skill) < def.requires.level;
        const needsContact = !!def.requiresContact && !contact;
        const needed = def.requiresBuilding;
        const needsBuilding = !!needed && buildingLevel(state, needed.id) < needed.level;
        const locked = skillLocked || needsContact || needsBuilding;
        const lockTag =
          skillLocked && def.requires
            ? `${SKILL_BY_ID[def.requires.skill].name} ${def.requires.level}`
            : needsContact
              ? "Needs contact"
              : needsBuilding && needed
                ? `${BUILDING_BY_ID[needed.id].name} ${needed.level}`
                : undefined;
        const cost = buildingCost(state, def.id);
        const credits = buildingCredits(state, def.id);
        const costLines = [
          ...(Object.entries(cost) as [ItemId, number][]).map(([id, n]) => {
            const have = Math.floor(count(state, id));
            return `- ${have >= n ? "✅" : "❌"} ${ITEMS[id].name}: ${have}/${n}`;
          }),
          ...(credits
            ? [`- ${state.credits >= credits ? "✅" : "❌"} Credits: ${Math.floor(state.credits)}/${credits}`]
            : []),
        ];
        return (
          <List.Item
            key={def.id}
            title={def.name}
            keywords={["building", ...(def.produces ? [ITEMS[def.produces.item].name] : [])]}
            icon={locked ? { source: Icon.Lock, tintColor: Color.SecondaryText } : Icon.House}
            accessories={[
              ...(lockTag ? [{ tag: lockTag }] : []),
              {
                tag: {
                  value: `Lv ${level}/${def.maxLevel}`,
                  color: level ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={[
                  buildingMarkdown(def.id, level, props.frame, level > 0),
                  `# ${def.name}`,
                  def.description,
                  "",
                  `**Now:** ${effectLine(def, level, state)}`,
                  ...(def.levelNotes
                    ? [
                        "",
                        ...def.levelNotes.map(
                          (note, i) =>
                            `${i + 1 === level ? "**▶" : "-"} Level ${i + 1}: ${note}${i + 1 === level ? "**" : ""}`,
                        ),
                      ]
                    : []),
                  ...(maxed ? ["", "_Fully built._"] : ["", `**Next level costs:**`, ...costLines]),
                  ...(def.id === "beacon" && contact
                    ? ["", "📡 **The locals have arrived. They are curious, and not hostile.**"]
                    : []),
                ].join("\n")}
              />
            }
            actions={
              <ActionPanel>
                {!maxed && (
                  <Action
                    title={level ? "Upgrade" : "Build"}
                    icon={Icon.Hammer}
                    onAction={() => props.onBuild(def.id)}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
