import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { getGameVersion } from "@/lib/utils/lunaris";
import { ELEMENT_COLORS, RARITY, WEAPON_TYPE } from "@/lib/constants";

import CharacterAscensionMaterials from "./character-ascension-mats";
import CharacterConstellations from "./character-constellations";

type Props = {
  id: string;
  character: GenshinCharacter;
};

export default function SingleCharacter({ id, character }: Props) {
  const { isLoading, data } = usePromise(async () => {
    const gameVersion = await getGameVersion();
    if (!gameVersion) return undefined;

    const res = await fetch(`https://api.lunaris.moe/data/${gameVersion}/en/char/${id}.json`);
    if (!res.ok) return undefined;
    const characterData = (await res.json()) as GenshinCharacterSingle;
    return characterData;
  });

  if (!data) return <Detail isLoading={true} />;

  const maxLevelStats = getLevel90Profile(data);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
![](https://api.lunaris.moe/data/assets/gachaimg/${character.GachaImg}.png)
# ${data.info.name}
${data.info.description}
## ${data.skills.normalattack.name} (Normal Attack)
${data.skills.normalattack.description
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}
${getLevel10Table(data.skills.normalattack.multipliers)}

## ${data.skills.elementalskill.name} (Elemental Skill)
${data.skills.elementalskill.description
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}
${getLevel10Table(data.skills.elementalskill.multipliers)}

## ${data.skills.elementalburst.name} (Elemental Burst)
${data.skills.elementalburst.description
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}
${getLevel10Table(data.skills.elementalburst.multipliers)}
			`}
      navigationTitle={data.info.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Rarity" text={"★".repeat(RARITY[character.qualityType])} />
          <Detail.Metadata.TagList title="Element & Weapon">
            <Detail.Metadata.TagList.Item
              text={character.element === "Unknown" ? "Adaptive" : character.element}
              icon={`elements/${character.element === "Unknown" ? "adaptive" : character.element.toLowerCase()}.png`}
              color={ELEMENT_COLORS[character.element]}
            />
            <Detail.Metadata.TagList.Item
              text={WEAPON_TYPE[character.weaponType]}
              icon={`weapons/${character.weaponType}.png`}
              color={"#FFFFFF"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Base Stats (Level 90)">
            <Detail.Metadata.TagList.Item text={`HP: ${maxLevelStats.hp.toLocaleString("en-US")}`} />
            <Detail.Metadata.TagList.Item text={`ATK: ${maxLevelStats.atk.toLocaleString("en-US")}`} />
            <Detail.Metadata.TagList.Item text={`DEF: ${maxLevelStats.def.toLocaleString("en-US")}`} />
            <Detail.Metadata.TagList.Item
              text={`${maxLevelStats.specialStatName}: ${maxLevelStats.specialStatValue}`}
              color={Color.Yellow}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Birthday" text={data.info.birthday} />
          <Detail.Metadata.Label title="Constellation" text={data.info.constellation} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Ascension Materials"
            target={<CharacterAscensionMaterials character={data} />}
            icon={Icon.PlusSquare}
          />
          <Action.Push title="Constellations" target={<CharacterConstellations character={data} />} icon={Icon.Stars} />
          <Action.OpenInBrowser url={`https://lunaris.moe/character/${id}`} />
        </ActionPanel>
      }
    />
  );
}

export function getLevel90Profile(charData: GenshinCharacterSingle) {
  const stats = charData.info.attributes.find((a) => a.level === 90) || charData.info.attributes[0];

  const standardKeys = ["level", "ascension", "hp", "atk", "def"];
  const specialKey = Object.keys(stats).find((key) => !standardKeys.includes(key));

  return {
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    specialStatName: specialKey || "None",
    specialStatValue: specialKey ? stats[specialKey] : "0",
  };
}

export function getLevel10Table(multipliers: Record<string, string[]>): string {
  const header = "| Skill | Level 10 Value |\n| :--- | :--- |\n";

  const rows = Object.entries(multipliers)
    .map(([skill, values]) => {
      const val = values[9] || "N/A";
      return `| **${skill}** | ${val} |`;
    })
    .join("\n");

  return header + rows;
}
