import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api"
import sunCalc from "suncalc"
import { countryList } from "../../assets/countryList"
import { CityItem } from "../../types/CityItem"
import { convertDateToString } from "../common/convertDateToString"
import { resolveCoords } from "../common/resolveCoords"

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
    const { pop } = useNavigation()
    const moreSunInfos = sunCalc.getTimes(new Date(), coordinates.lat, coordinates.lon)
    const solarNoon = convertDateToString(moreSunInfos.solarNoon, timezone)
    const nadir = convertDateToString(moreSunInfos.nadir, timezone)
    const dawn = convertDateToString(moreSunInfos.dawn, timezone)
    const dusk = convertDateToString(moreSunInfos.dusk, timezone)

    const moonTimes = sunCalc.getMoonTimes(new Date(), coordinates.lat, coordinates.lon)
    const moonrise = !moonTimes.rise ? "Moon doesn't rise today" : convertDateToString(moonTimes.rise, timezone)
    const moonset = !moonTimes.set ? "Moon doesn't set today" : convertDateToString(moonTimes.set, timezone)
    const moonIllumination = sunCalc.getMoonIllumination(new Date())

    const cityInfo = `# ${name}  ${countryList[countryCode].flag}\n\n`
    const headings = `### ☀️ Sun \t\t\t\t\t\t\t\t\t\t 🌖  Moon\n`
    const riseTimes = `Sunrise: ${sunrise}  \t\t\t\t\t\t\t\t Moonrise: ${moonrise}\n\n`
    const setTimes = `Sunset: ${sunset} \t\t\t\t\t\t\t\t\t Moonset: ${moonset}\n\n`
    const moreInfo1 = `Dawn: ${dawn} \t\t\t\t\t\t\t\t\t Moon Illumination: ${(moonIllumination.fraction * 100).toFixed(
        1
    )}%\n\n`
    const moreInfo2 = `Dusk: ${dusk} \n\n`

    const otherHeadings = `### ⌛ Other Info\n`
    const otherInfo1 = `Day Duration: ${dayDuration}\n\n`
    const otherInfo2 = `Solar Noon: ${solarNoon}, Nadir: ${nadir}`

    const infoText = `${cityInfo} ${headings} ${riseTimes} ${setTimes} ${moreInfo1} ${moreInfo2} ${otherHeadings} ${otherInfo1} ${otherInfo2}`

    return (
        <Detail
            navigationTitle={`${name} ${countryList[countryCode].flag}  |  ${resolveCoords(
                coordinates.lat,
                coordinates.lon
            )}`}
            markdown={infoText}
            actions={
                <ActionPanel>
                    <Action title="Go Back" icon={Icon.ArrowCounterClockwise} onAction={() => pop()} />
                </ActionPanel>
            }
        />
    )
}
