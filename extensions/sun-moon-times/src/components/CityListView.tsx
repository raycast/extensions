import { List } from "@raycast/api"
import { useFetch } from "@raycast/utils"
import { useState } from "react"
import { ressourceUrl } from "../ressources/ressourceUrl"
import { ResponseData } from "../../types/ResponseData"
import { CityListItemView } from "./CityListItemView"
import { useFavorites } from "./FavoritesProvider"

export const CityListView = () => {
    const [searchText, setSearchText] = useState<string>("")
    const { isLoading, data } = useFetch<ResponseData>(ressourceUrl(searchText))

    const { favorites } = useFavorites()

    return (
        <List isLoading={isLoading} onSearchTextChange={setSearchText}>
            {searchText.length === 0 ? (
                <List.Section title="Favorites">
                    {favorites.map((city) => {
                        const { geonameId, name, countryCode, timezone, coordinates } = city
                        return (
                            <CityListItemView
                                key={geonameId}
                                geonameId={geonameId}
                                name={name}
                                countryCode={countryCode}
                                timezone={timezone}
                                coordinates={coordinates}
                                isFavorite
                            />
                        )
                    })}
                </List.Section>
            ) : (
                data?.records.map(({ record: { fields: city } }) => {
                    const { geoname_id, name, country_code, timezone, coordinates } = city
                    return (
                        <CityListItemView
                            key={geoname_id}
                            geonameId={geoname_id}
                            name={name}
                            countryCode={country_code}
                            timezone={timezone}
                            coordinates={coordinates}
                        />
                    )
                })
            )}
        </List>
    )
}
