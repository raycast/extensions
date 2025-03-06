import { List } from "@raycast/api"
import { useFetch } from "@raycast/utils"
import { useState } from "react"
import { ResponseData } from "../../types/ResponseData"
import { ressourceUrl } from "../ressources/ressourceUrl"
import { CityListDropdownView } from "./CityListDropdownView"
import { CityListItemView } from "./CityListItemView"
import { useFavorites } from "./FavoritesProvider"

export const CityListView = () => {
    const [searchText, setSearchText] = useState<string>("")
    const [currentDate, setCurrentDate] = useState<Date>(
        new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    )
    const { isLoading, data } = useFetch<ResponseData>(ressourceUrl(searchText))

    const { favorites } = useFavorites()

    return (
        <List
            isLoading={isLoading}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search a city..."
            searchBarAccessory={<CityListDropdownView setCurrentDate={setCurrentDate} />}
            isShowingDetail
            throttle
        >
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
                                currentDate={currentDate}
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
                            currentDate={currentDate}
                            coordinates={coordinates}
                        />
                    )
                })
            )}
        </List>
    )
}
