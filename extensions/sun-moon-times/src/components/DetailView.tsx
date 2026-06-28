import { List } from "@raycast/api"
import sunCalc from "suncalc"
import { getSunrise, getSunset } from "sunrise-sunset-js"
import { CityItem } from "../../types/CityItem"
import { countryList } from "../ressources/countryList"
import { convertDateToString } from "../utils/convertDateToString"
import { getDayDuration } from "../utils/getDayDuration"
import { resolveCoords } from "../utils/resolveCoords"

interface DetailViewProps extends Omit<CityItem, "geonameId"> {
    currentDate: Date
}

export const DetailView = ({ name, countryCode, timezone, coordinates, currentDate }: DetailViewProps) => {
    const currentDateTimezoneAdjusted = new Date(currentDate.getTime() - new Date().getTimezoneOffset() * 60 * 1000)
    const sunrise = getSunrise(coordinates.lat, coordinates.lon, currentDateTimezoneAdjusted)
    const sunset = getSunset(coordinates.lat, coordinates.lon, currentDateTimezoneAdjusted)
    const dayDuration = getDayDuration(sunrise, sunset)
    const sunriseString = convertDateToString(sunrise, timezone)
    const sunsetString = convertDateToString(sunset, timezone)

    const moreSunInfos = sunCalc.getTimes(currentDate, coordinates.lat, coordinates.lon)
    const solarNoon = convertDateToString(moreSunInfos.solarNoon, timezone)
    const nadir = convertDateToString(moreSunInfos.nadir, timezone)
    const dawn = convertDateToString(moreSunInfos.dawn, timezone)
    const dusk = convertDateToString(moreSunInfos.dusk, timezone)

    const moonTimes = sunCalc.getMoonTimes(currentDate, coordinates.lat, coordinates.lon)
    const moonrise = !moonTimes.rise ? "Moon doesn't rise today" : convertDateToString(moonTimes.rise, timezone)
    const moonset = !moonTimes.set ? "Moon doesn't set today" : convertDateToString(moonTimes.set, timezone)
    const moonIllumination = sunCalc.getMoonIllumination(currentDate)

    return (
        <List.Item.Detail
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                        title={`${countryList[countryCode].flag} ${name}`}
                        text={resolveCoords(coordinates.lat, coordinates.lon)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="☀️ Sun" />
                    <List.Item.Detail.Metadata.Label title="Sunrise" text={sunriseString} />
                    <List.Item.Detail.Metadata.Label title="Sunset" text={sunsetString} />
                    <List.Item.Detail.Metadata.Label title="Dawn" text={dawn} />
                    <List.Item.Detail.Metadata.Label title="Dusk" text={dusk} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="🌖 Moon" />
                    <List.Item.Detail.Metadata.Label title="Moonrise" text={moonrise} />
                    <List.Item.Detail.Metadata.Label title="Moonset" text={moonset} />
                    <List.Item.Detail.Metadata.Label
                        title="Moon Illumination"
                        text={`${(moonIllumination.fraction * 100).toFixed(1)}%`}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="⌛ Other Info" />
                    <List.Item.Detail.Metadata.Label title="Day Duration" text={dayDuration} />
                    <List.Item.Detail.Metadata.Label title="Solar Noon" text={solarNoon} />
                    <List.Item.Detail.Metadata.Label title="Nadir" text={nadir} />
                </List.Item.Detail.Metadata>
            }
        />
    )
}
