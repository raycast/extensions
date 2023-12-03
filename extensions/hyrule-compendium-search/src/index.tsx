import { Detail, LaunchProps, PopToRootType, showHUD } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import names from "./names.json"
import Fuse from 'fuse.js'

interface CreatureResponse {
	isLoading: boolean;
	data?: object;
}

interface EntryArgument {
	entryName: string
}

interface Category {
	category: string;
}

interface Entry {
	name: string; // entry name
	id: number; // ID as shown in compendium
	category: string; // "monsters"
	image: string; // URL of image
	common_locations: string[] | null; // where the entry is commonly seen
}

interface Monsters {
    name: string; // entry name
    id: number; // ID as shown in compendium
    category: string; // "monsters"
    description: string; // short paragraph
    image: string; // URL of image
    common_locations: string[] | null; // where the entry is commonly seen
    drops: string[] | null; // recoverable materials from killing
}

interface Equipment {
    name: string; // entry name
    id: number; // ID as shown in compendium
    category: string; // "equipment"
    description: string; // short paragraph
    image: string; // URL of image
    common_locations: string[] | null; // array of strings or null for unknown; where the entry is commonly seen
    properties: {
        attack: number; // damage the entry does (0 for shields and arrows)
        defense: number; // defense the entry offers (0 for equipment that aren't shields)
    };
}

interface Material {
    name: string; // entry name
    id: number; // ID as shown in compendium
    category: string; // "materials"
    description: string; // short paragraph
    image: string; // URL of image
    common_locations: string[] | null; // where the entry is commonly seen
    hearts_recovered: number; // health recovered when eaten raw
    cooking_effect: string | null; // special effect when used in a dish/elixir (e.g. "stamina recovery"), empty if none
}

interface Creature {
    name: string; // entry name
    id: number; // ID as shown in compendium
    category: string; // "creatures"
    description: string; // short paragraph
    image: string; // URL of image
    cooking_effect: string; // special effect when used in a dish/elixir (e.g. "stamina recovery"), empty if none
    common_locations: string[] | null; // where the entry is commonly seen
    edible: boolean; // whether the creature can be eaten or incorporated into a dish/elixir
    hearts_recovered: number | undefined; // hearts recovered when eaten raw
	drops: string[] | null; // array of strings or null for unknown; recoverable materials from killing
    dlc: boolean; // whether the entry is from a DLC pack
}

interface Treasure {
    name: string; // string
    id: number; // integer; ID as shown in compendium
    category: string; // string; "treasure"
    description: string; // string; short paragraph
    image: string; // string; URL of image
    common_locations: string[] | null; // array of strings or null for unknown; where the entry is commonly seen
    drops: string[] | null; // array of strings or null for unknown; recoverable materials when accessed
    dlc: boolean; // boolean; whether the entry is from a DLC pack
}

const options = {
	includeScore: true,
	threshold: 0.5,
	includeMatches: true,
};

const fuse = new Fuse(names, options);

export default function Command(props: LaunchProps<{ arguments: EntryArgument }>) {
	const { entryName } = props.arguments;

	// function searchEntry(searchString: string) {
	// 	let underscored: string = "";

  	// 	for (const name of names) {
    // 		if (name.includes(searchString)) {
	// 			// replace all spaces with underscores
	// 			underscored = name.replace(/\s/g, "_");
	// 			break
    // 		}
	// 	}

  	// 	return underscored;
	// }

	const fuseSearch = fuse.search(entryName)

	if (fuseSearch.length == 0) {
		async function checkForResults() {
			await showHUD("No entry found 🚫", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });

		}
		checkForResults()
		// stop the function call
		return;
	}

	const searchResult = fuse.search(entryName)[0].item.replace(/\s/g, "_")
	console.log(searchResult)

	const { isLoading, data } = useFetch<CreatureResponse>(`https://botw-compendium.herokuapp.com/api/v3/compendium/entry/${searchResult}`);
	// const entry = data?.data as Equipment;
	const category = data?.data as Category;
	let entry: any;
	
	if (category?.category == "monsters") {
		entry = data?.data as Monsters;

	} else if (category?.category == "equipment") {
		entry = data?.data as Equipment;

	} else if (category?.category == "material") {
		entry = data?.data as Material;

	} else if (category?.category == "creature") {
		entry = data?.data as Creature;

	} else if (category?.category == "treasure") {
		entry = data?.data as Treasure
	} else {
		entry = data?.data as Entry
	}

	const markdown = 
`# ${entry?.name.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())}

	${entry?.description}

![Entry Image](${entry?.image})
`;
	
	function checkForCategory() {
		if (category?.category == "monsters" || category?.category == "treasure") {
			if (entry?.drops == null || entry?.drops.length == 0) {return (

					<Detail.Metadata.TagList title="Drops">
						<Detail.Metadata.TagList.Item text={"None"} />
					</Detail.Metadata.TagList>

				)} else {return (

					<Detail.Metadata.TagList title="Drops">
						
						{entry?.drops.map((index: any) => (
							<Detail.Metadata.TagList.Item text={index} key={index} />  
						))}

					</Detail.Metadata.TagList>

				)}
		} else if (category?.category == "equipment") {
			if (entry?.properties.attack > 0) {return(

				<Detail.Metadata.Label title="Attack" text={entry?.properties.attack.toString()} />
				
			)} else if (entry?.properties.defense > 0) {return(
					
				<Detail.Metadata.Label title="Defense" text={entry?.properties.defense.toString()} />
				
			)} else {

				if (entry?.name == "shock arrow") {return(<>

					<Detail.Metadata.Label title="Elemental Effect" text={"Electricity"} />
					<Detail.Metadata.Label title="Bonus Atack" text={"20"} />

				</>)} else if (entry?.name == "bomb arrow") {return(<>
				
					<Detail.Metadata.Label title="Elemental Effect" text={"EXPLOSIONS!!!!!!!! 💥💥💣💣🤯🤯"} />
					<Detail.Metadata.Label title="Bonus Atack" text={"50"} />

				</>)} else if (entry?.name == "ice arrow") {return(<>
					
					<Detail.Metadata.Label title="Elemental Effect" text={"Ice"} />
					<Detail.Metadata.Label title="Bonus Atack" text={"10"} />

				</>)} else if (entry?.name == "fire arrow") {return(<>
	
					<Detail.Metadata.Label title="Elemental Effect" text={"Fire"} />
					<Detail.Metadata.Label title="Bonus Attack" text={"10"} />
				
				</>)} else if (entry?.name == "ancient arrow") {return(<>
	
					<Detail.Metadata.Label title="Elemental Effect" text={"Death."} />
					<Detail.Metadata.Label title="Bonus Attack" text={"1.5x (only on bosses)"} />
				
				</>)} else {return(<>
				
					<Detail.Metadata.Label title="Elemental Effect" text={"None"} />
					<Detail.Metadata.Label title="Bonus Attack" text={"None"} />
				
				</>)}

			}
		} else if (category?.category == "materials") {
			
			if (entry?.cooking_effect == "") {return(<>
				
				<Detail.Metadata.Label title="Cooking Effect" text={"None"} />
				<Detail.Metadata.Label title="Hearts Recovered" text={entry?.hearts_recovered.toString()} />

			</>)} else {return(<>

				<Detail.Metadata.Label title="Cooking Effect" text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())} />
				<Detail.Metadata.Label title="Hearts Recovered" text={entry?.hearts_recovered.toString()} />

		</>)}} else if (category?.category == "creatures") {
			if (entry?.edible == true) {return(<>

				<Detail.Metadata.Label title="Cooking Effect" text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())} />
				<Detail.Metadata.Label title="Hearts Recovered" text={entry?.hearts_recovered.toString()} />

			</>)} else {
				
				if (entry?.drops.length == 0) {return(<>
				
					<Detail.Metadata.TagList title="Drops">
						<Detail.Metadata.TagList.Item text={"None"} />
					</Detail.Metadata.TagList>
				
				</>)} else {return(<>
			
					<Detail.Metadata.TagList title="Drops">
						
						{entry?.drops.map((index: any) => (
							<Detail.Metadata.TagList.Item text={index} key={index} />  
						))}

					</Detail.Metadata.TagList>
			
				</>)}
			
			}
		}
	}

	return(
	<Detail
		isLoading={isLoading}
		markdown={markdown}
		navigationTitle={entry?.name.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())}
		metadata={
			<Detail.Metadata>

			{checkForCategory()}

			<Detail.Metadata.Separator />

			<Detail.Metadata.TagList title="Common Locations">

				{/* Common locations */}
				{entry?.common_locations === null
  					? <Detail.Metadata.TagList.Item text={"Unknown"} />
  					: entry?.common_locations.map((index: any) => (
							<Detail.Metadata.TagList.Item text={index} key={index} />
					))}

			</Detail.Metadata.TagList>

			<Detail.Metadata.Label title="Category" text={entry?.category} />

			</Detail.Metadata>
		}
    />)
}
