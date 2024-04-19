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
	if (!damageData || Object.keys(damageData).length === 0 ){ return null;}

    const renderedData = Object.entries(damageData).map(([key, value]) => (
        <List.Item.Detail.Metadata.TagList.Item text={`${key}: ${value}`} color={"#eed535"} />
    ));

    return <List.Item.Detail.Metadata.TagList title="Damage at Level:">{renderedData}</List.Item.Detail.Metadata.TagList>;
};

export default function SpellDetail(spell: index) {
	const spellData = getDnd(spell.url) as spellType;
	if (!spellData?.data) {
		return <Unresponsive />;
	}

	if(spellData.isLoading) {
		return <Detail isLoading={true} />;
	}
	else {
		let spellDesc = `# ${spellData.data?.name} \n\n ${spellData.data.desc.map(str => `${str}\n\n`).join("")} \n\n`;
		if(spellData.data.higher_level.length > 0) {
			spellDesc += `--- \n\n **At higher level:** ${spellData.data.higher_level.map(str => `${str}\n\n`).join("")} \n\n`;
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
						<List.Item.Detail.Metadata.TagList title="Details">
							{spellData.data?.damage?.damage_type.name && (
								<List.Item.Detail.Metadata.TagList.Item
									key={spellData.data.index}
									text={`Type: ${spellData.data?.damage?.damage_type.name}`}
									color={"#eed535"} 
								/>
							)}
							<List.Item.Detail.Metadata.TagList.Item text={`Range: ${spellData.data.range}`} color={"#eed535"} />
							<List.Item.Detail.Metadata.TagList.Item text={`Duration: ${spellData.data.duration}`} color={"#eed535"} />
							<List.Item.Detail.Metadata.TagList.Item text={`Cast Time: ${spellData.data.casting_time}`} color={"#eed535"} />
						</List.Item.Detail.Metadata.TagList>
						{renderDamageData(spellData.data?.damage?.damage_at_character_level || {})}
						<List.Item.Detail.Metadata.Label title="Range" text={spellData.data.range} />
					</List.Item.Detail.Metadata>
				}
			/>
		)
	}
}