import { useState, useEffect } from "react"
import { List } from "@raycast/api"

import { Item } from "../types"
import { ItemListItem } from "./ItemListItem"
import { fetchItems } from "../fetch"

export const ItemList = () => {
	const [items, setItems] = useState<Item[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshItems = async () => {
		setIsLoading(true)
		setItems(await fetchItems())
		setIsLoading(false)
	}

	useEffect(() => {
		refreshItems()
	}, [])

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder="Search Dota 2 items..."
			isShowingDetail
		>
			{items.map((item, index) => (
				<ItemListItem key={index} item={item} />
			))}
		</List>
	)
}
