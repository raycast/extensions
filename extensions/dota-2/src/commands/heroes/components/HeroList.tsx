import { useState, useEffect, useMemo } from "react"
import { List } from "@raycast/api"

import { Hero } from "../types"
import { HeroListItem } from "./HeroListItem"
import { fetchHeroes } from "../fetch"
import { Attribute } from "../../../types"
import { ATTRIBUTES } from "../../../data/attributes"

type Filter =
	| Attribute
	| "CAPTAINS_MODE_ENABLED"
	| "CAPTAINS_MODE_DISABLED"
	| "MELEE"
	| "RANGED"
	| "NONE"

export const HeroList = () => {
	const [heroes, setHeroes] = useState<Hero[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const [filter, setFilter] = useState<Filter>("NONE")

	const refreshHeroes = async () => {
		setIsLoading(true)
		setHeroes(await fetchHeroes())
		setIsLoading(false)
	}

	useEffect(() => {
		refreshHeroes()
	}, [])

	const filteredHeroes = useMemo((): Hero[] => {
		switch (filter) {
			case "NONE":
				return heroes
			case "MELEE":
				return heroes.filter((hero) => hero.stats.isMelee)
			case "RANGED":
				return heroes.filter((hero) => !hero.stats.isMelee)
			case Attribute.AGILITY:
			case Attribute.INTELLIGENCE:
			case Attribute.STRENGTH:
				return heroes.filter((hero) => hero.primaryAttribute === filter)
			case "CAPTAINS_MODE_DISABLED":
				return heroes.filter((hero) => !hero.captainsModeEnabled)
			case "CAPTAINS_MODE_ENABLED":
				return heroes.filter((hero) => hero.captainsModeEnabled)
		}
	}, [heroes, filter])

	return (
		<List
			isLoading={isLoading}
			searchBarAccessory={
				<List.Dropdown
					tooltip="Select Filter"
					onChange={(newValue) => {
						setFilter(newValue as Filter)
					}}
					value={filter}
				>
					<List.Dropdown.Item title="No Filter" value="NONE" />
					{Object.values(Attribute).map((attribute) => (
						<List.Dropdown.Item
							key={attribute}
							title={`${ATTRIBUTES[attribute].name} Hero`}
							value={attribute}
						/>
					))}
					<List.Dropdown.Item title="Melee" value="MELEE" />
					<List.Dropdown.Item title="Ranged" value="RANGED" />
					<List.Dropdown.Item
						title="Enabled in Captain’s Mode"
						value="CAPTAINS_MODE_ENABLED"
					/>
					<List.Dropdown.Item
						title="Disabled in Captain’s Mode"
						value="CAPTAINS_MODE_DISABLED"
					/>
				</List.Dropdown>
			}
			searchBarPlaceholder="Search Dota 2 heroes..."
			isShowingDetail
		>
			{filteredHeroes.map((hero) => (
				<HeroListItem key={hero.name} hero={hero} />
			))}
		</List>
	)
}
