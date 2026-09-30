import { Detail, LaunchProps, popToRoot, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import names from "./names.json";
import Fuse from "fuse.js";

interface CreatureResponse {
	isLoading: boolean;
	data?: object;
}

interface EntryArgument {
	entryName: string;
}

interface Category {
	category: string;
}

interface Entry {
	name: string; // entry name
	id: number; // ID as shown in compendium
	category: string; // "monsters"
	description: string; // short paragraph
	image: string; // URL of image
	common_locations: string[] | null; // where the entry is commonly seen
	//
	drops: string[]; // recoverable materials from killing
	properties: {
		attack: number; // damage the entry does (0 for shields and arrows)
		defense: number; // defense the entry offers (0 for equipment that aren't shields)
	};
	hearts_recovered: number; // health recovered when eaten raw
	cooking_effect: string; // special effect when used in a dish/elixir (e.g. "stamina recovery"), empty if none
	edible: boolean; // whether the creature can be eaten or incorporated into a dish/elixir
}

const options = {
	includeScore: true,
	threshold: 0.5,
	includeMatches: true,
};

const fuse = new Fuse(names, options);

async function checkForResults() {
	popToRoot();
	await showToast({
		title: "No entry found.",
		style: Toast.Style.Failure,
		// clearRootSearch: true,
		// popToRootType: PopToRootType.Immediate,
	});
}

const capitalize = (str: string) =>
	str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

export default function Command(props: LaunchProps<{ arguments: EntryArgument }>) {
	const { entryName } = props.arguments;

	const fuseSearch = fuse.search(entryName);

	if (fuseSearch.length == 0) {
		checkForResults();
		// stop the function call
		return;
	}

	const searchResult = fuse.search(entryName)[0].item.replace(/\s/g, "_");

	const { isLoading, data } = useFetch<CreatureResponse>(
		`https://botw-compendium.herokuapp.com/api/v3/compendium/entry/${searchResult}`,
	);
	// const entry = data?.data as Equipment;
	const category = data?.data as Category;
	const entry = data?.data as Entry;

	const markdown = `# ${entry?.name.replace(/(^|\s)\S/g, (match: string) => match.toUpperCase())}

${entry?.description}

![Entry Image](${entry?.image})
`;

	function checkForCategory() {
		if (category?.category == "monsters" || category?.category == "treasure") {
			if (entry?.drops == null || entry?.drops.length == 0) {
				return (
					<Detail.Metadata.TagList title="Drops">
						<Detail.Metadata.TagList.Item text={"None"} />
					</Detail.Metadata.TagList>
				);
			} else if (entry?.drops[0] == "treasures") {
				return (
					<Detail.Metadata.TagList title="Drops">
						<Detail.Metadata.TagList.Item
							text={"Treasures"}
							key={"treasures"}
							icon={{ source: `materialIcons/treasureIcon.png` }}
						/>
					</Detail.Metadata.TagList>
				);
			} else {
				return (
					<Detail.Metadata.TagList title="Drops">
						{entry?.drops.map((index: string) => (
							<Detail.Metadata.TagList.Item
								text={capitalize(index)}
								key={index}
								icon={{ source: `materialIcons/${index}.png` }}
							/>
						))}
					</Detail.Metadata.TagList>
				);
			}
		} else if (category?.category == "equipment") {
			if (entry?.properties.attack > 100000) {
				return (
					<Detail.Metadata.Label title="Attack" icon={{ source: "materialIcons/attack.png" }} text={"∞"} />
				);
			} else if (entry?.properties.attack > 0) {
				return (
					<Detail.Metadata.Label
						title="Attack"
						icon={{ source: "materialIcons/attack.png" }}
						text={entry?.properties.attack.toString()}
					/>
				);
			} else if (entry?.properties.defense > 0) {
				return (
					<Detail.Metadata.Label
						title="Defense"
						icon={{ source: "materialIcons/guard.png" }}
						text={entry?.properties.defense.toString()}
					/>
				);
			} else {
				if (entry?.name == "shock arrow") {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"Electricity"} />
							<Detail.Metadata.Label title="Bonus Atack" text={"20"} />
						</>
					);
				} else if (entry?.name == "bomb arrow") {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"EXPLOSIONS!!!!!!!! 💥💥💣💣🤯🤯"} />
							<Detail.Metadata.Label title="Bonus Atack" text={"50"} />
						</>
					);
				} else if (entry?.name == "ice arrow") {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"Ice"} />
							<Detail.Metadata.Label title="Bonus Atack" text={"10"} />
						</>
					);
				} else if (entry?.name == "fire arrow") {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"Fire"} />
							<Detail.Metadata.Label title="Bonus Attack" text={"10"} />
						</>
					);
				} else if (entry?.name == "ancient arrow") {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"💀 Death."} />
							<Detail.Metadata.Label title="Bonus Attack" text={"1.5x (only on bosses)"} />
						</>
					);
				} else {
					return (
						<>
							<Detail.Metadata.Label title="Elemental Effect" text={"None"} />
							<Detail.Metadata.Label title="Bonus Attack" text={"None"} />
						</>
					);
				}
			}
		} else if (category?.category == "materials") {
			if (entry?.cooking_effect == "") {
				return (
					<>
						<Detail.Metadata.Label title="Cooking Effect" text={"None"} />
						<Detail.Metadata.Label
							title="Hearts Recovered"
							icon={{ source: `materialIcons/${entry?.hearts_recovered.toString()}.png` }}
							// text={entry?.hearts_recovered.toString()}
						/>
					</>
				);
			} else {
				if (entry?.hearts_recovered == 0) {
					return (
						<>
							<Detail.Metadata.Label
								title="Cooking Effect"
								icon={{ source: `materialIcons/${entry?.cooking_effect}.png` }}
								text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) =>
									match.toUpperCase(),
								)}
							/>
							{/* <Detail.Metadata.Label
								title="Hearts Recovered"
								icon={{ source: `materialIcons/${entry?.hearts_recovered.toString()}.png` }}
								text={entry?.hearts_recovered.toString()}
							/> */}
						</>
					);
				} else {
					return (
						<>
							<Detail.Metadata.Label
								title="Cooking Effect"
								icon={{ source: `materialIcons/${entry?.cooking_effect}.png` }}
								text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) =>
									match.toUpperCase(),
								)}
							/>
							<Detail.Metadata.Label
								title="Hearts Recovered"
								icon={{ source: `materialIcons/${entry?.hearts_recovered.toString()}.png` }}
								// text={entry?.hearts_recovered.toString()}
							/>
						</>
					);
				}
			}
		} else if (category?.category == "creatures") {
			if (entry?.edible == true) {
				if (entry?.hearts_recovered == 0) {
					return (
						<>
							<Detail.Metadata.Label
								title="Cooking Effect"
								icon={{ source: `materialIcons/${entry?.cooking_effect}.png` }}
								text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) =>
									match.toUpperCase(),
								)}
							/>
						</>
					);
				} else {
					if (entry?.cooking_effect == "") {
						return (
							<Detail.Metadata.Label
								title="Hearts Recovered"
								icon={{ source: `materialIcons/${entry?.hearts_recovered.toString()}.png` }}
								// text={entry?.hearts_recovered.toString()}
							/>
						);
					} else {
						return (
							<>
								<Detail.Metadata.Label
									title="Cooking Effect"
									icon={{ source: `materialIcons/${entry?.cooking_effect}.png` }}
									text={entry?.cooking_effect.replace(/(^|\s)\S/g, (match: string) =>
										match.toUpperCase(),
									)}
								/>
								<Detail.Metadata.Label
									title="Hearts Recovered"
									icon={{ source: `materialIcons/${entry?.hearts_recovered.toString()}.png` }}
									// text={entry?.hearts_recovered.toString()}
								/>
							</>
						);
					}
				}
			} else {
				if (entry?.name == "blupee") {
					return (
						<>
							<Detail.Metadata.TagList title="Drops">
								<Detail.Metadata.TagList.Item
									text={"Rupees"}
									icon={{ source: "materialIcons/Treasures.png" }}
								/>
							</Detail.Metadata.TagList>
						</>
					);
				} else if (!entry?.drops || entry?.drops.length == 0) {
					return (
						<>
							<Detail.Metadata.TagList title="Drops">
								<Detail.Metadata.TagList.Item text={"None"} />
							</Detail.Metadata.TagList>
						</>
					);
				} else {
					return (
						<>
							<Detail.Metadata.TagList title="Drops">
								{entry?.drops.map((index: string) => (
									<Detail.Metadata.TagList.Item
										text={capitalize(index)}
										key={index}
										icon={{ source: `materialIcons/${index}.png` }}
									/>
								))}
							</Detail.Metadata.TagList>
						</>
					);
				}
			}
		}
	}

	console.log(searchResult);
	if (isLoading) {
		return (
			<Detail
				isLoading={true}
				metadata={
					<Detail.Metadata>
						<Detail.Metadata.Separator />

						<Detail.Metadata.TagList title="Common Locations">
							<Detail.Metadata.TagList.Item text={"Unknown"} />
							<Detail.Metadata.TagList.Item text={"Unknown"} />
						</Detail.Metadata.TagList>

						<Detail.Metadata.Label title="Category" text={"Unknown"} />
					</Detail.Metadata>
				}
			/>
		);
	} else {
		return (
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
							{entry?.common_locations === null ? (
								<Detail.Metadata.TagList.Item text={"Unknown"} />
							) : (
								entry?.common_locations.map((index: string) => (
									<Detail.Metadata.TagList.Item text={index} key={index} />
								))
							)}
						</Detail.Metadata.TagList>

						<Detail.Metadata.Label
							// icon={{source: "materialIcons/treasures.png"}}
							title="Category"
							icon={{ source: `materialIcons/${entry?.category}.png` }}
							text={capitalize(entry?.category)}
						/>
					</Detail.Metadata>
				}
			/>
		);
	}
}
