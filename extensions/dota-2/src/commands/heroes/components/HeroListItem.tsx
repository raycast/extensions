import { Action, ActionPanel, List } from "@raycast/api"
import { ATTRIBUTES } from "../../../data/attributes"

import { Hero } from "../types"

export const HeroListItem = ({ hero }: { hero: Hero }) => {
	const attribute = ATTRIBUTES[hero.primaryAttribute]

	return (
		<List.Item
			id={hero.name}
			key={hero.name}
			title={hero.name}
			icon={hero.images.icon}
			detail={
				<List.Item.Detail
					metadata={
						<List.Item.Detail.Metadata>
							<List.Item.Detail.Metadata.TagList title="Type">
								{hero.stats.roles
									.filter((_, index) => index < 5)
									.map((role) => (
										<List.Item.Detail.Metadata.TagList.Item
											key={role}
											text={role}
										/>
									))}
							</List.Item.Detail.Metadata.TagList>

							<List.Item.Detail.Metadata.Separator />

							<List.Item.Detail.Metadata.Label
								title="Primary Attribute"
								icon={attribute.icon}
								text={attribute.name}
							/>
							<List.Item.Detail.Metadata.Label
								title="Movement Speed"
								text={String(hero.stats.movementSpeed)}
							/>
							<List.Item.Detail.Metadata.Label
								title="Attack Range"
								text={String(hero.stats.attackRange)}
							/>
							<List.Item.Detail.Metadata.Label
								title="Base Health Regeneration"
								text={String(hero.stats.baseHealthRegeneration)}
							/>

							<List.Item.Detail.Metadata.Separator />

							{hero.abilities
								.filter((ability) => ability.name)
								.map((ability, index) => (
									<List.Item.Detail.Metadata.Label
										key={index}
										title={[
											ability.name,
											`(${[
												ability.damageType,
												ability.isPiercingBkb ? "Pierces BKB" : null,
											]
												.filter(Boolean)
												.join(", ")})`,
										]
											.filter((x) => x && x !== "()")
											.join(" ")}
										icon={ability.urls.image}
										text={ability.manaCost.join(" ")}
									/>
								))}

							<List.Item.Detail.Metadata.Separator />

							<List.Item.Detail.Metadata.Label
								title="Captains Mode"
								text={hero.captainsModeEnabled ? "Enabled" : "Disabled"}
							/>
						</List.Item.Detail.Metadata>
					}
				/>
			}
			accessories={[
				{
					icon: { source: ATTRIBUTES[hero.primaryAttribute].icon },
					tooltip: ATTRIBUTES[hero.primaryAttribute].name,
				},
			]}
			actions={
				<ActionPanel>
					<Action.OpenInBrowser
						icon={{ source: "links/wiki.ico" }}
						shortcut={{ modifiers: ["cmd"], key: "w" }}
						title="Open on Dota 2 Wiki"
						url={hero.links.wiki}
					/>
					<Action.OpenInBrowser
						icon={{ source: "links/opendota.png" }}
						title="Open on OpenDota"
						shortcut={{ modifiers: ["cmd"], key: "o" }}
						url={hero.links.opendota}
					/>
					<Action.OpenInBrowser
						icon={{ source: "links/dotabuff.png" }}
						title="Open on Dotabuff"
						shortcut={{ modifiers: ["cmd"], key: "d" }}
						url={hero.links.dotabuff}
					/>
				</ActionPanel>
			}
		/>
	)
}
