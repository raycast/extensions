import { Action, ActionPanel, Detail } from "@raycast/api"
import { countryList } from "../ressources/countryList"
import { calculateDistance } from "../utils/calculateDistance"

interface AirportDetails {
    code: string
    name: string
    country: string
    lat: number
    lon: number
}

interface ResultViewProps {
    origin: AirportDetails
    destination: AirportDetails
    milesPercentage: number
}

export const ResultView = ({ origin, destination, milesPercentage }: ResultViewProps) => {
    const distance = calculateDistance(
        { latitude: origin.lat, longitude: origin.lon },
        { latitude: destination.lat, longitude: destination.lon }
    )

    const milesEarned = distance.mi * milesPercentage

    return (
        <Detail
            navigationTitle="Calculated Miles"
            actions={
                <ActionPanel>
                    <Action.CopyToClipboard title="Copy Miles Earned" content={milesEarned.toFixed(0)} />
                    <Action.CopyToClipboard title="Copy Distance in Miles" content={distance.mi.toFixed(0)} />
                    <Action.CopyToClipboard
                        title="Copy Distance in Kilometers"
                        content={distance.km.toFixed(0)}
                        shortcut={{ modifiers: ["opt"], key: "enter" }}
                    />
                </ActionPanel>
            }
            markdown={`### Origin:\t\t\t\t\t[${origin.code}] ${origin.name}, ${countryList[origin.country].name}
            \n### Destination: \t\t\t[${destination.code}] ${destination.name}, ${countryList[destination.country].name}
            \n### Miles Percentage:\t\t${milesPercentage * 100}%
            \n### Distance:\t\t\t\t${distance.mi.toFixed(0)}mi (${distance.km.toFixed(0)}km)

            \n## This translates to *${milesEarned.toFixed(0)} Miles* earned for this flight${
                milesEarned > 5000 ? " 🎉" : "!"
            }
            `}
        />
    )
}
