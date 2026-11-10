import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { BUILDING_BY_ID, PERKS, perkCost, perkLevel, RUN_MODS } from "../engine/data";
import { canLaunch, starlightGain } from "../engine/prestige";
import { GameState } from "../engine/types";

export function Voyage(props: {
  state: GameState;
  onLaunch: () => void;
  onBuy: (id: string) => void;
  onToggleMod: (id: string) => void;
}) {
  const { state } = props;
  const ready = canLaunch(state);
  const gain = starlightGain(state);
  return (
    <>
      <List.Section title="Rescue" subtitle={`${state.launches} launch${state.launches === 1 ? "" : "es"}`}>
        <List.Item
          title="Launch the Rescue Ship"
          icon={ready ? Icon.Rocket : { source: Icon.Lock, tintColor: Color.SecondaryText }}
          accessories={[{ tag: { value: `+${gain} Starlight`, color: ready ? Color.Orange : Color.SecondaryText } }]}
          detail={
            <List.Item.Detail
              markdown={[
                "# Leave Soren",
                ready
                  ? "The ship is ready. Launching starts the whole game over, and what you keep is listed below."
                  : `Build the ${BUILDING_BY_ID.rescue_ship.name} in Base first. It needs Engineering 95 and 2,000,000 credits.`,
                "",
                `**This launch earns ${gain} Starlight:** one for every 15 skill levels, two for every boss beaten, and five for getting out${state.mods.length ? `, and more for the modifiers on this run` : ""}.`,
                "",
                "**Reset:** skills, items, Base, gear, credits, Marks, bounties and Hydroponics.",
                "**Kept:** Starlight, perks, lifetime stats and your settings, and a share of mastery with Muscle Memory. Modifiers picked below are in force on the next run.",
                "",
                `**Next run:** creatures are ${Math.round((state.launches + 1) * 10)}% stronger and every haul is ${(state.launches + 1) * 5}% bigger.`,
                "",
                "_A copy of your save goes to the clipboard first._",
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              {ready && (
                <Action title="Launch" icon={Icon.Rocket} style={Action.Style.Destructive} onAction={props.onLaunch} />
              )}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Next Run Modifiers" subtitle="Harder for more Starlight when you launch from it">
        {RUN_MODS.map((mod) => {
          const picked = state.nextMods.includes(mod.id);
          return (
            <List.Item
              key={mod.id}
              title={mod.name}
              icon={picked ? Icon.CheckCircle : Icon.Circle}
              accessories={[
                {
                  tag: {
                    value: `+${Math.round(mod.bonus * 100)}% Starlight`,
                    color: picked ? Color.Orange : Color.SecondaryText,
                  },
                },
                ...(state.mods.includes(mod.id) ? [{ tag: "On now" }] : []),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${mod.name}\n${mod.description}\n\nWhen you launch from a run with this on, that launch earns ${Math.round(mod.bonus * 100)}% more Starlight. Picking it now starts your next run with it on.${state.mods.includes(mod.id) ? "\n\n_On in this run._" : ""}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={picked ? "Drop for Next Run" : "Take for Next Run"}
                    icon={Icon.Switch}
                    onAction={() => props.onToggleMod(mod.id)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Perks" subtitle={`${state.starlight} Starlight`}>
        {PERKS.map((perk) => {
          const level = perkLevel(state, perk.id);
          const maxed = level >= perk.maxLevel;
          const cost = perkCost(state, perk);
          return (
            <List.Item
              key={perk.id}
              title={perk.name}
              icon={Icon.Stars}
              accessories={[
                { tag: `${level}/${perk.maxLevel}` },
                ...(maxed
                  ? []
                  : [
                      {
                        tag: {
                          value: `${cost} Starlight`,
                          color: state.starlight >= cost ? Color.Orange : Color.SecondaryText,
                        },
                      },
                    ]),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`# ${perk.name}\n${perk.description}\n\nLevel ${level} of ${perk.maxLevel}.${maxed ? "" : ` Next level costs **${cost} Starlight**.`}`}
                />
              }
              actions={
                <ActionPanel>
                  {!maxed && (
                    <Action
                      title={`Buy for ${cost} Starlight`}
                      icon={Icon.Cart}
                      onAction={() => props.onBuy(perk.id)}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </>
  );
}
