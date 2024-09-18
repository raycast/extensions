import { Detail, ActionPanel } from "@raycast/api";
import { getDnd } from "../utils/dndData";
import { index, monster } from "../utils/types";
import DiceAction from "../templates/diceAction";
import Unresponsive from "../templates/unresponsive";

interface monsterType {
  isLoading: boolean;
  data: monster;
}

export default function MonsterDetail(monster: index) {
  const foeData = getDnd(monster.url) as monsterType;

  if (!foeData?.data && foeData.isLoading === true) {
    return <Detail isLoading={true} />;
  }

  if (!foeData?.data && foeData.isLoading === false) {
    return <Unresponsive />;
  }

  const foe = foeData?.data;

  let foeMarkdown = `# ${foe?.name}\n`;
  if (foe?.image) {
    foeMarkdown += `![Illustration](https://www.dnd5eapi.co${foe?.image})\n`;
  }
  // Saving throws
  foeMarkdown += `## Stats \n |Str|Dex|Con|Int|Wis|Cha|\n`;
  foeMarkdown += `|---|---|---|---|---|---|\n`;
  foeMarkdown += `|${foe?.strength}|${foe?.dexterity}|${foe?.constitution}|${foe?.intelligence}|${foe?.wisdom}|${foe?.charisma}|\n`;

  // Proficiencies
  if (foe?.proficiencies.length) {
    foeMarkdown += `## Proficiencies\n|`;
    for (const proficiency of foe.proficiencies) {
      foeMarkdown += `${proficiency.proficiency.name}|`;
    }
    foeMarkdown += `\n|`;
    for (let i = 0; i < foe.proficiencies.length; i++) {
      foeMarkdown += `---|`;
    }
    foeMarkdown += `\n|`;
    for (const proficiency of foe.proficiencies) {
      foeMarkdown += `${proficiency.value}|`;
    }
  }

  // Damage vulnerabilities
  if (foe?.damage_vulnerabilities) {
    foeMarkdown += `## Damage Vulnerabilities\n`;
    for (const vulnerability of foe.damage_vulnerabilities) {
      foeMarkdown += `* ${vulnerability}\n`;
    }
  }

  // Damage resistance
  if (foe?.damage_resistances.length > 0) {
    foeMarkdown += `## Damage Resistances\n`;
    for (const resistance of foe.damage_resistances) {
      foeMarkdown += `* ${resistance}\n`;
    }
  }

  // Condition immunities
  if (foe?.condition_immunities.length > 0) {
    foeMarkdown += `## Condition Immunities\n`;
    for (const immunity of foe.condition_immunities) {
      foeMarkdown += `* ${immunity.name}\n`;
    }
  }

  // Actions
  if (foe?.actions.length > 0) {
    foeMarkdown += `--- \n ## Actions\n`;
    for (const action of foe.actions) {
      foeMarkdown += `### ${action.name}\n`;
      foeMarkdown += `${action.desc}\n`;
    }
  }

  // roll die for HP and damage
  // set up supporting data
  const hpDie = `icons/chance/1d${foe?.hit_dice.split("d")[1]}.png`;
  const damageDie = `icons/chance/1d${foe?.hit_dice.split("d")[1]}.png`;
  const languages = foe?.languages.split(",");

  return (
    <Detail
      isLoading={foeData.isLoading}
      navigationTitle={"D&D: " + foe.name + " Info"}
      markdown={foeMarkdown}
      actions={
        <ActionPanel title={`${foe.name} Actions:`}>
          <DiceAction icon={hpDie} title={`HP: `} before={`Roll for Hit Points: `} roll={foe.hit_points_roll} />
          <DiceAction icon={damageDie} title={`Attack: `} before={`Roll for Attack: `} roll={foe.hit_dice} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Size" text={foe.size} />
          <Detail.Metadata.Label title="Type" text={foe.type} />
          <Detail.Metadata.Label title="Alignment" text={foe.alignment} />
          {foe.armor_class.map((armor) => (
            <Detail.Metadata.Label key={armor.type} title={`Armor (AC): ${armor.type}`} text={armor.value.toString()} />
          ))}
          <Detail.Metadata.Label title="Challenge Rating (CR)" text={foe.challenge_rating.toString()} />
          <Detail.Metadata.Label title="Proficiency Bonus" text={foe.proficiency_bonus.toString()} />
          {foe.damage_immunities.length && (
            <Detail.Metadata.TagList title="Damage Immunities">
              {foe.damage_immunities.map((immunity) => (
                <Detail.Metadata.TagList.Item key={immunity} text={immunity} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {foe.languages.length && (
            <Detail.Metadata.TagList title="Languages">
              {languages.map((language) => (
                <Detail.Metadata.TagList.Item key={language} text={language} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Label title="XP" text={foe.xp.toString()} />
        </Detail.Metadata>
      }
    />
  );
}
