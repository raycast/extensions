export type ItemAttribute = {
	name: string
	value: string
}

export type Item = {
	name: string
	lore: string | null
	hints: string[]
	qual: string

	images: {
		big: string
	}

	links: {
		dotabuff: string
		wiki: string
	}

	attributes: ItemAttribute[]

	stats: {
		cost: number | null
		manaCost: number | null
	}
}
