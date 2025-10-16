import { Attribute } from "../../types"

export type Ability = {
	name: string | null

	// metadata
	damageType: string | null
	isPiercingBkb: boolean
	manaCost: string[]
	urls: {
		image: string
	}
}

export type Hero = {
	// basic data
	name: string

	abilities: Ability[]

	// metadata
	captainsModeEnabled: boolean
	legs: number
	primaryAttribute: Attribute
	images: {
		big: string
		icon: string
	}
	links: {
		dotabuff: string
		opendota: string
		wiki: string
	}
	stats: {
		attackRange: number
		baseHealthRegeneration: number
		isMelee: boolean
		movementSpeed: number
		roles: string[]
	}
}
