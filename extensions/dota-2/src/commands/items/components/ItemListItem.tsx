import { Action, ActionPanel, List } from "@raycast/api"
import { Dashes } from "@metatypes/typography"

import { Item } from "../types"

export const ItemListItem = ({ item }: { item: Item }) => {
	return (
		<List.Item
			title={item.name}
			icon={item.images.big}
			detail={
				<List.Item.Detail
					markdown={[
						`![${item.name} Icon](${item.images.big})`,
						...item.hints.map((hint) => `${hint}`),
						"---",
						`_${item.lore ?? "This item has no lore."}_`,
					].join("\n\n")}
					metadata={
						<List.Item.Detail.Metadata>
							<List.Item.Detail.Metadata.Label
								title="Cost"
								icon={{ source: "gold.webp" }}
								text={item.stats.cost ? String(item.stats.cost) : Dashes.EmDash}
							/>
							<List.Item.Detail.Metadata.Label
								title="Mana Cost"
								icon={{ source: "mana.webp" }}
								text={
									item.stats.manaCost
										? String(item.stats.manaCost)
										: Dashes.EmDash
								}
							/>

							<List.Item.Detail.Metadata.Separator />

							{item.attributes.map((a, index) => (
								<List.Item.Detail.Metadata.Label
									key={index}
									title={a.name}
									text={a.value}
								/>
							))}
						</List.Item.Detail.Metadata>
					}
				/>
			}
			accessories={[
				{
					text: item.qual,
				},
			]}
			actions={
				<ActionPanel>
					<Action.OpenInBrowser
						icon={{ source: "links/wiki.ico" }}
						shortcut={{ modifiers: ["cmd"], key: "w" }}
						title="Open on Dota 2 Wiki"
						url={item.links.wiki}
					/>
					<Action.OpenInBrowser
						icon={{ source: "links/dotabuff.png" }}
						title="Open on Dotabuff"
						shortcut={{ modifiers: ["cmd"], key: "d" }}
						url={item.links.dotabuff}
					/>
				</ActionPanel>
			}
		/>
	)
}
