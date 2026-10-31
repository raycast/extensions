import { describeItem } from "../engine/format";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { EQUIP_SLOTS, ITEMS } from "../engine/data";
import { count, equipError, isEquipped, levelOf, maxHp, modifiers, playerArmor, playerDamage } from "../engine/engine";
import { EquipSlot, GameState, ItemId } from "../engine/types";

/** The effect of a piece of gear, in words. */
export function gearStats(id: ItemId): string {
  const item = ITEMS[id];
  const parts: string[] = [];
  if (item.tool) parts.push(`${Math.round((1 - item.tool.speed) * 100)}% faster ${item.tool.skill}`);
  if (item.weaponDamage) parts.push(`+${item.weaponDamage} damage`);
  if (item.armor) parts.push(`-${item.armor} damage taken`);
  if (item.rareBonus) parts.push(`${Math.round((item.rareBonus - 1) * 100)}% more rare finds`);
  return parts.join(", ");
}

const owned = (state: GameState, slot: EquipSlot): ItemId[] =>
  (Object.keys(ITEMS) as ItemId[])
    .filter((id) => ITEMS[id].slot === slot && count(state, id) > 0)
    .sort((a, b) => (ITEMS[b].tier ?? 0) - (ITEMS[a].tier ?? 0));

export function Equipment(props: {
  state: GameState;
  onEquip: (id: ItemId) => void;
  onUnequip: (slot: EquipSlot) => void;
}) {
  const { state } = props;
  const m = modifiers(state);

  return (
    <>
      <List.Section title="Equipment">
        {EQUIP_SLOTS.map(({ id: slot, name }) => {
          const worn = state.equipped[slot];
          const candidates = owned(state, slot);
          return (
            <List.Item
              key={slot}
              title={name}
              subtitle={worn ? ITEMS[worn].name : "Empty"}
              icon={worn ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.Circle }}
              accessories={[
                ...(worn ? [{ text: gearStats(worn) }] : []),
                ...(worn && (ITEMS[worn].tier ?? 0) > 0 ? [{ tag: `Tier ${ITEMS[worn].tier}` }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${name}`,
                    worn ? `**${ITEMS[worn].name}**\n\n${describeItem(ITEMS[worn])}` : "_Nothing worn._",
                    "",
                    candidates.length
                      ? "**You own:**"
                      : "_You own nothing for this slot yet. Craft it in Engineering._",
                    ...candidates.map((c) => {
                      const error = equipError(state, c);
                      return `- ${isEquipped(state, c) ? "▶ " : ""}${ITEMS[c].name} (tier ${ITEMS[c].tier ?? 1}): ${gearStats(c)}${error ? ` — _${error}_` : ""}`;
                    }),
                  ].join("\n")}
                />
              }
              actions={
                <ActionPanel>
                  {candidates
                    .filter((c) => !isEquipped(state, c))
                    .map((c) => (
                      <Action
                        key={c}
                        title={`Equip ${ITEMS[c].name}`}
                        icon={Icon.Check}
                        onAction={() => props.onEquip(c)}
                      />
                    ))}
                  {worn && <Action title="Unequip" icon={Icon.XMarkCircle} onAction={() => props.onUnequip(slot)} />}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Combat">
        <List.Item title="Damage per round" icon={Icon.Bolt} accessories={[{ text: `${playerDamage(state)}` }]} />
        <List.Item title="Armor" icon={Icon.Shield} accessories={[{ text: `${playerArmor(state)}` }]} />
        <List.Item
          title="Combat level"
          icon={Icon.Heart}
          accessories={[{ text: `${levelOf(state, "combat")} · ${maxHp(state)} max HP` }]}
        />
        {m.rare > 1 && (
          <List.Item
            title="Rare finds"
            icon={Icon.Stars}
            accessories={[{ text: `${Math.round((m.rare - 1) * 100)}% more likely` }]}
          />
        )}
      </List.Section>
    </>
  );
}
