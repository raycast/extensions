import { List } from "@raycast/api"
import sunCalc from "suncalc"
import { CityItem } from "../../types/CityItem"
import { convertDateToString } from "../common/convertDateToString"
import { resolveCoords } from "../common/resolveCoords"
import { countryList } from "../ressources/countryList"

interface DetailViewProps extends Omit<CityItem, "geonameId"> {
    sunrise: string
    sunset: string
    dayDuration: string
}

export const DetailView = ({
    name,
    countryCode,
    timezone,
    coordinates,
    sunrise,
    sunset,
    dayDuration,
}: DetailViewProps) => {
    const moreSunInfos = sunCalc.getTimes(new Date(), coordinates.lat, coordinates.lon)
    const solarNoon = convertDateToString(moreSunInfos.solarNoon, timezone)
    const nadir = convertDateToString(moreSunInfos.nadir, timezone)
    const dawn = convertDateToString(moreSunInfos.dawn, timezone)
    const dusk = convertDateToString(moreSunInfos.dusk, timezone)

    const moonTimes = sunCalc.getMoonTimes(new Date(), coordinates.lat, coordinates.lon)
    const moonrise = !moonTimes.rise ? "Moon doesn't rise today" : convertDateToString(moonTimes.rise, timezone)
    const moonset = !moonTimes.set ? "Moon doesn't set today" : convertDateToString(moonTimes.set, timezone)
    const moonIllumination = sunCalc.getMoonIllumination(new Date())

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
                    <List.Item.Detail.Metadata.Label title="Sunrise" text={sunrise} />
                    <List.Item.Detail.Metadata.Label title="Sunset" text={sunset} />
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
