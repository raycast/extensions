import { Color, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getGameVersion } from "@/lib/utils/lunaris";
import { RARITY, RARITY_COLORS, WEAPON_TYPE } from "@/lib/constants";

type Props = {
  id: string;
  weapon: GenshinWeapon;
  refinementLevel: number;
};

export default function WeaponDetail({ id, weapon, refinementLevel }: Props) {
  const { isLoading, data } = useCachedPromise(async () => {
    const gameVersion = await getGameVersion();
    if (!gameVersion) return undefined;

    const res = await fetch(`https://api.lunaris.moe/data/${gameVersion}/en/weapon/${id}.json`);
    if (!res.ok) return undefined;
    const characterData = (await res.json()) as GenshinWeaponDetail;
    return characterData;
  });

  const ascensionStats = splitAscensionStats(weapon);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={
        data === undefined
          ? "Loading weapon information..."
          : `
# ${weapon.enName}
${data.weaponDesc ?? ""}

${
  data.passive
    ? `
## ${data.passive.name} (Passive) (R${refinementLevel})
${data.passive.refinements[refinementLevel]
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}	
`
    : ""
}
			`
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Type & Rarity">
            <List.Item.Detail.Metadata.TagList.Item
              icon={{ source: `weapons/${weapon.weaponType}.png` }}
              text={WEAPON_TYPE[weapon.weaponType as keyof typeof WEAPON_TYPE]}
              color={"#ffffff"}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={"★".repeat(RARITY[weapon.qualityType])}
              color={RARITY_COLORS[weapon.qualityType]}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Ascension Stats (Lv. 90)">
            <List.Item.Detail.Metadata.TagList.Item text={`ATK: ${ascensionStats.baseAtk}`} color={"#ffffff"} />
            {ascensionStats.secondaryStat && (
              <List.Item.Detail.Metadata.TagList.Item
                text={`${ascensionStats.secondaryStat.label}: ${ascensionStats.secondaryStat.value}`}
                color={Color.Yellow}
              />
            )}
          </List.Item.Detail.Metadata.TagList>
          {data ? <></> : <List.Item.Detail.Metadata.Label title={""} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function splitAscensionStats({ ascensionStats }: GenshinWeapon) {
  const { atk, ...rest } = ascensionStats;
  const secondaryKey = Object.keys(rest)[0];

  return {
    baseAtk: atk,
    secondaryStat: secondaryKey
      ? {
          label: secondaryKey,
          value: rest[secondaryKey],
        }
      : null,
  };
}
