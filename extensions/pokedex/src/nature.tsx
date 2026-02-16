import { Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { fetchNatures } from "./api";

export const natureIconMap: Record<string, Icon> = {
  // Neutral
  hardy: Icon.Circle,
  docile: Icon.Circle,
  serious: Icon.Circle,
  bashful: Icon.Circle,
  quirky: Icon.Circle,

  // +Attack, -Defense / Sp. stats
  lonely: Icon.Bolt, // +Atk, -Def
  adamant: Icon.Bolt, // +Atk, -SpA
  naughty: Icon.Bolt, // +Atk, -SpD
  brave: Icon.Bolt, // +Atk, -Spe

  // +Defense, -Atk / Sp. stats
  bold: Icon.Shield, // +Def, -Atk
  impish: Icon.Shield, // +Def, -SpA
  lax: Icon.Shield, // +Def, -SpD
  relaxed: Icon.Shield, // +Def, -Spe

  // +Sp. Atk, -Atk / Def / SpD / Spe
  modest: Icon.LightBulb, // +SpA, -Atk
  mild: Icon.LightBulb, // +SpA, -Def
  rash: Icon.LightBulb, // +SpA, -SpD
  quiet: Icon.LightBulb, // +SpA, -Spe

  // +Sp. Def, -Atk / Def / SpA / Spe
  calm: Icon.Heart, // +SpD, -Atk
  gentle: Icon.Heart, // +SpD, -Def
  careful: Icon.Heart, // +SpD, -SpA
  sassy: Icon.Heart, // +SpD, -Spe

  // +Speed, -Atk / Def / SpA / SpD
  timid: Icon.Windsock, // +Spe, -Atk
  hasty: Icon.Windsock, // +Spe, -Def
  jolly: Icon.Windsock, // +Spe, -SpA
  naive: Icon.Windsock, // +Spe, -SpD
};

export default function NatureCommand(props: {
  arguments: { search?: string };
}) {
  const { search } = props.arguments;
  const { data: natures, isLoading } = usePromise(fetchNatures);

  const filteredNatures = useMemo(() => {
    if (!search || !natures) return natures;
    return natures.filter((n) => {
      const natureName = n.naturenames[0]?.name || n.name;
      return natureName.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, natures]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Nature..."
      throttle
    >
      {filteredNatures?.map((nature) => {
        const natureName = nature.naturenames[0]?.name || nature.name;
        const increasedStat =
          nature.increased_stat?.statnames[0]?.name ||
          nature.increased_stat?.name;
        const decreasedStat =
          nature.decreased_stat?.statnames[0]?.name ||
          nature.decreased_stat?.name;

        const isNeutral = !increasedStat && !decreasedStat;

        const accessories: List.Item.Accessory[] = [];

        if (!isNeutral) {
          if (increasedStat) {
            accessories.push({
              tag: { value: `+10% ${increasedStat}`, color: Color.Green },
            });
          }
          if (decreasedStat) {
            accessories.push({
              tag: { value: `-10% ${decreasedStat}`, color: Color.Red },
            });
          }
        } else {
          accessories.push({
            tag: { value: "-", color: Color.SecondaryText },
          });
        }

        return (
          <List.Item
            key={nature.id}
            title={natureName}
            icon={natureIconMap[nature.name] || Icon.QuestionMark}
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
