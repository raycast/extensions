import { Attribute } from "../types"

export const ATTRIBUTES: Record<
	Attribute,
	{
		icon: string
		name: string
	}
> = {
	[Attribute.AGILITY]: {
		icon: "attributes/agi.webp",
		name: "Agility",
	},
	[Attribute.INTELLIGENCE]: {
		icon: "attributes/int.webp",
		name: "Intelligence",
	},
	[Attribute.STRENGTH]: {
		icon: "attributes/str.webp",
		name: "Strength",
	},
}
