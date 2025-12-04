import axios from "axios"
import { z } from "zod"
import { ItemAttribute, Item } from "./types"
import { Dashes } from "@metatypes/typography"
import startCase from "lodash.startcase"

const itemsSchema = z.record(
	z.object({
		id: z.number().int(),
		qual: z.string().optional(),
		dname: z.string().optional(),
		img: z.string(),
		cost: z.number().int().min(0).nullable(),
		mc: z.preprocess(
			(mc) => (mc === false ? null : mc),
			z.number().int().min(0).nullable(),
		),
		lore: z.string(),
		attrib: z.array(
			z.object({
				footer: z.string().optional(),
				header: z.string().optional(),
				value: z.union([z.array(z.unknown()), z.string()]),
			}),
		),
		hint: z.array(z.string()).default(() => []),
	}),
)

export const fetchItems = async (): Promise<Item[]> => {
	const responseItems = await axios.get(
		"https://api.opendota.com/api/constants/items",
	)

	const items = itemsSchema.parse(responseItems.data)

	return Object.values(items)
		.filter((item) => item.dname)
		.filter((item) => !item.dname?.includes("Recipe"))
		.map((item): Item => {
			const name = item.dname as string

			return {
				qual: item.qual
					? startCase(item.qual.replace(/_/g, " "))
					: Dashes.EmDash,
				attributes: item.attrib.map(
					(a): ItemAttribute => ({
						name: a.footer ?? a.header ?? Dashes.EmDash,
						value: a.value
							? Array.isArray(a.value)
								? a.value.join(", ")
								: a.value
							: Dashes.EmDash,
					}),
				),
				lore: item.lore || null,
				hints: item.hint.map((h) => h.replace(/%+[a-zA-Z_]+%+/g, "?")),
				images: {
					big: `https://api.opendota.com${item.img}`,
				},
				name,
				links: {
					dotabuff: `https://www.dotabuff.com/items/${name
						.toLowerCase()
						.replace(/ /g, "-")
						.replace(/'/g, "")}`,
					wiki: `https://dota2.fandom.com/wiki/${name.replace(/ /g, "_")}`,
				},
				stats: {
					cost: item.cost ?? null,
					manaCost: item.mc ?? null,
				},
			}
		})
		.sort((a, b) => a.name.localeCompare(b.name))
}
