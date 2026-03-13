import axios from "axios"
import { z } from "zod"
import { Attribute } from "../../types"
import { Ability, Hero } from "./types"

const heroStatsSchema = z.array(
	z.object({
		id: z.number().int(),
		name: z.string(),
		localized_name: z.string(),
		primary_attr: z.nativeEnum(Attribute),
		attack_type: z.enum(["Melee", "Ranged"]),
		roles: z.array(z.string()),
		img: z.string(),
		icon: z.string(),
		base_health_regen: z.number(),
		attack_range: z.number(),
		move_speed: z.number(),
		cm_enabled: z.boolean(),
		legs: z.number().int(),
	}),
)

const heroAbilitiesSchema = z.record(
	z.object({
		abilities: z.array(z.string()),
		talents: z.array(
			z.object({
				name: z.string(),
				level: z.number(),
			}),
		),
	}),
)

const abilitiesSchema = z.record(
	z.object({
		dname: z.string().optional(),
		dmg_type: z.preprocess(
			(v) => (typeof v === "string" ? v : undefined),
			z.string().optional(),
		),
		img: z.string().optional(),
		bkbpierce: z.preprocess((v) => v === "Yes", z.boolean()),
		mc: z.preprocess(
			(value) => (typeof value === "string" ? [value] : value),
			z.array(z.string()).default(() => []),
		),
	}),
)

export const fetchHeroes = async (): Promise<Hero[]> => {
	const [responseHeroStats, responseAbilities, responseHeroAbilities] =
		await Promise.all([
			axios.get("https://api.opendota.com/api/heroStats"),
			axios.get("https://api.opendota.com/api/constants/abilities"),
			axios.get("https://api.opendota.com/api/constants/hero_abilities"),
		])

	const heroes = heroStatsSchema.parse(responseHeroStats.data)
	const heroAbilities = heroAbilitiesSchema.parse(responseHeroAbilities.data)
	const abilities = abilitiesSchema.parse(responseAbilities.data)

	return heroes
		.map(
			(hero): Hero => ({
				abilities: heroAbilities[hero.name].abilities.map(
					(abilityId): Ability => {
						const ability = abilities[abilityId]

						return {
							damageType: ability.dmg_type ?? null,
							isPiercingBkb: ability.bkbpierce,
							name: ability.dname || null,
							manaCost: ability.mc,
							urls: {
								image: `https://api.opendota.com${ability.img}`,
							},
						}
					},
				),
				captainsModeEnabled: hero.cm_enabled,
				images: {
					big: `https://api.opendota.com${hero.img}`,
					icon: `https://api.opendota.com${hero.icon}`,
				},
				legs: hero.legs,
				name: hero.localized_name,
				primaryAttribute: hero.primary_attr,
				links: {
					dotabuff: `https://www.dotabuff.com/heroes/${hero.localized_name
						.toLowerCase()
						.replace(/ /g, "-")}`,
					opendota: `https://www.opendota.com/heroes/${hero.id}`,
					wiki: `https://dota2.fandom.com/wiki/${hero.localized_name.replace(
						/ /g,
						"_",
					)}`,
				},
				stats: {
					attackRange: hero.attack_range,
					baseHealthRegeneration: hero.base_health_regen,
					isMelee: hero.attack_type === "Melee",
					movementSpeed: hero.move_speed,
					roles: hero.roles,
				},
			}),
		)
		.sort((a, b) => a.name.localeCompare(b.name))
}
