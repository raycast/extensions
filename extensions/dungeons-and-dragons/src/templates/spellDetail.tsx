import { Detail, List } from "@raycast/api";
import { getDnd } from "../utils/dndData";
import { index, spell } from "../utils/types";
import DiceAction from "../templates/diceAction";
import Unresponsive from "./unresponsive";

interface spellType {
  isLoading: boolean;
  data: spell;
}

const renderDamageData = (damageData: { [key: string]: string }) => {
  if (!damageData || Object.keys(damageData).length === 0) {
    return null;
  }

  const renderedData = Object.entries(damageData).map(([key, value]) => (
    <List.Item.Detail.Metadata.TagList.Item key={key+value} text={`${key}: ${value}`} color={"#eed535"} />
  ));

  return <List.Item.Detail.Metadata.TagList title="Damage at Level:">{renderedData}</List.Item.Detail.Metadata.TagList>;
};

const renderSpellComponents = (components: string[]) => {
  if (!components || components.length === 0) {
    return null;
  }
  return components.map((comp, index) => {
    let component = "";
    let color = "";
    switch (comp) {
      case "V":
        component = "Verbal";
        color = "#9b59b6";
        break;
      case "S":
        component = "Somatic";
        color = "#3498db";
        break;
      case "M":
        component = "Material";
        color = "#e67e22";
        break;
      default:
        component = comp;
    }
    return <List.Item.Detail.Metadata.TagList.Item key={comp + index} text={component} color={color} />;
  });
};

const damageColor = (damage: string) => {
    switch (damage.toLowerCase()) {
        case 'acid':
            return '#00ff00';
        case 'bludgeoning':
            return '#a9a9a9';
        case 'cold':
            return '#1e90ff';
        case 'fire':
            return '#ff4500';
        case 'force':
            return '#800080';
        case 'lightning':
            return '#ffd700';
        case 'necrotic':
            return '#800000';
        case 'piercing':
            return '#8b4513';
        case 'poison':
            return '#32cd32';
        case 'psychic':
            return '#9932cc';
        case 'radiant':
            return '#ffff00';
        case 'slashing':
            return '#ff6347';
        case 'thunder':
            return '#4682b4';
        default:
            return '#333'; // Default color if damage type is not found
    }
}


export default function SpellDetail(spell: index) {
  const spellData = getDnd(spell.url) as spellType;
  if (!spellData?.data) {
    return <Unresponsive />;
  }

  if (spellData.isLoading) {
    return <List.Item.Detail isLoading={true} />;
  } else {
    let spellDesc = `# ${spellData.data?.name} \n\n ${spellData.data.desc.map((str) => `${str}\n\n`).join("")} \n\n`;
    if (spellData.data.higher_level.length > 0) {
      spellDesc += `--- \n\n **At higher level:** ${spellData.data.higher_level
        .map((str) => `${str}\n\n`)
        .join("")} \n\n`;
    }

    // Todo list:
    // - colors for tags
    // - dc checks
    //  - action: dc roll
    // - school of magic
    // - classes
    // - action: damage roll
    return (
      <List.Item.Detail
        markdown={spellDesc}
        metadata={
          <List.Item.Detail.Metadata>
			<List.Item.Detail.Metadata.Label title="School: "text={spellData.data.school.name} icon={`icons/magic/${spellData.data.school.index}.png`} />
            <List.Item.Detail.Metadata.TagList title="Details: ">
              {spellData.data?.damage?.damage_type.name && (
                <List.Item.Detail.Metadata.TagList.Item
                  key={spellData.data.index}
                  text={`Type: ${spellData.data?.damage?.damage_type.name}`}
                  color={damageColor(spellData.data.damage.damage_type.index)}
                />
              )}
              <List.Item.Detail.Metadata.TagList.Item text={`Range: ${spellData.data.range}`} color={"#f9f9f9"} />
              <List.Item.Detail.Metadata.TagList.Item text={`Duration: ${spellData.data.duration}`} color={"#6A5ACD"} />
              <List.Item.Detail.Metadata.TagList.Item
                text={`Cast Time: ${spellData.data.casting_time}`}
                color={"#eed535"}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.TagList title="Components">
              {renderSpellComponents(spellData.data.components)}
            </List.Item.Detail.Metadata.TagList>
            {renderDamageData(spellData.data?.damage?.damage_at_character_level || {})}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }
}
