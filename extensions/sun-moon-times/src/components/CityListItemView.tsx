import { Action, ActionPanel, Alert, confirmAlert, Icon, List } from "@raycast/api"
import { getSunrise, getSunset } from "sunrise-sunset-js"
import { CityItem } from "../../types/CityItem"
import { convertDateToString } from "../common/convertDateToString"
import { getDayDuration } from "../common/getDayDuration"
import { countryList } from "../ressources/countryList"
import { DetailView } from "./DetailView"
import { useFavorites } from "./FavoritesProvider"

interface CityListItemViewProps extends CityItem {
    isFavorite?: boolean
}

export const CityListItemView = ({
    geonameId,
    name,
    countryCode,
    timezone,
    coordinates,
    isFavorite,
}: CityListItemViewProps) => {
    const city = { geonameId, name, countryCode, timezone, coordinates }
    const sunrise = getSunrise(coordinates.lat, coordinates.lon)
    const sunset = getSunset(coordinates.lat, coordinates.lon)
    const dayDuration = getDayDuration(sunrise, sunset)
    const sunriseString = convertDateToString(sunrise, timezone)
    const sunsetString = convertDateToString(sunset, timezone)

    const { addToFavorites, removeFromFavorites, moveFavorite } = useFavorites()

    return (
        <List.Item
            key={geonameId}
            icon={{ source: countryList[countryCode].flag }}
            title={name}
            detail={
                <DetailView
                    name={name}
                    countryCode={countryCode}
                    timezone={timezone}
                    coordinates={coordinates}
                    sunrise={sunriseString}
                    sunset={sunsetString}
                    dayDuration={dayDuration}
                />
            }
            actions={
                <ActionPanel>
                    {isFavorite ? (
                        <>
                            <Action
                                title="Remove from Favorites"
                                style={Action.Style.Destructive}
                                icon={Icon.Trash}
                                onAction={async () => {
                                    if (
                                        await confirmAlert({
                                            title: "Remove from favorites?",
                                            message: `${countryList[countryCode].flag} ${name}`,
                                            primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                                        })
                                    ) {
                                        await removeFromFavorites(city)
                                    }
                                }}
                            />
                            <Action
                                title="Move Favorite Up"
                                icon={Icon.ArrowUp}
                                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                                onAction={async () => await moveFavorite(city, "up")}
                            />
                            <Action
                                title="Move Favorite Down"
                                icon={Icon.ArrowDown}
                                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                                onAction={async () => await moveFavorite(city, "down")}
                            />
                        </>
                    ) : (
                        <Action
                            title="Add to Favorites"
                            icon={Icon.Star}
                            onAction={async () => await addToFavorites(city)}
                        />
                    )}
                </ActionPanel>
            }
        />
    )
}
