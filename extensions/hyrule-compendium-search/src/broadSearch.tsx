import { Action, ActionPanel, LaunchType, Grid, launchCommand } from "@raycast/api";
import names from "./names.json";
import { useFetch } from "@raycast/utils";

interface CreatureResponse {
	isLoading: boolean;
	data?: object;
}

interface Category {
	category: string;
}

export default function Command() {
	const miniBosses = [
		"hinox",
		"blue-maned lynel",
		"white-maned lynel",
		"silver lynel",
		"talus",
		"moldu",
		"scout",
		"stalker",
		"skywatcher",
		"turret",
	];

	function checkType(entry: string) {
		if (entry.includes("ganon") || entry.includes("kohga")) {
			return "boss";
		} else {
			for (let i = 0; i < miniBosses.length; i++) {
				if (entry.includes(miniBosses[i])) {
					return "miniboss";
				}
			}
			return "";
		}
	}

	function checkCategory(entry: string) {
		const { data } = useFetch<CreatureResponse>(
			`https://botw-compendium.herokuapp.com/api/v3/compendium/entry/${entry.replace(/ /g, "_")}`,
		);

		const category = data?.data as Category;

		const bossOrNot: string = checkType(entry);

		if (category?.category == "monsters") {
			return ["monster", "monsters", "mob", "mob", "enemy", "enemies", bossOrNot];
		} else if (category?.category == "equipment") {
			return ["weapon", "weapons", "equipment", bossOrNot];
		} else if (category?.category == "creatures") {
			return ["animals", "animal", "mob", "mobs", "creature", "creatures", "bug", "bugs", bossOrNot];
		} else if (category?.category == "materials") {
			return ["material", "fruit", "food", "flower", bossOrNot];
		}
	}

	return (
		<Grid navigationTitle="Search Entries" searchBarPlaceholder="Search for entries...">
			{names.map((item) => (
				<Grid.Item
					key={item}
					// content={{ source: `https://botw-compendium.herokuapp.com/api/v3/compendium/entry/${item.replace(/ /g, "_")}/image` }}
					content={{
						source: `https://media.assets.so/?url=https://botw-compendium.herokuapp.com/api/v3/compendium/entry/${item.replace(
							/ /g,
							"_",
						)}/image&w=128&f=webp`,
					}}
					title={item.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())}
					keywords={checkCategory(item)}
					actions={
						<ActionPanel>
							<Action
								title="Select"
								onAction={async () => {
									await launchCommand({
										name: "getEntry",
										type: LaunchType.UserInitiated,
										arguments: { entryName: item },
									});
								}}
							/>
						</ActionPanel>
					}
				/>
			))}
		</Grid>
	);
}
