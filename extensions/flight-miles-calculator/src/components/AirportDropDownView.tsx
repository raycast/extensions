import { Form } from "@raycast/api"
import { useFetch } from "@raycast/utils"
import { useState } from "react"
import { countryList } from "../ressources/countryList"
import { ressourceUrl } from "../ressources/ressourceUrl"
import { ApiResponse } from "../types/ApiResponse"

interface AirportDropDownViewProps {
    dropdownId: string
    title: string
    autofocus?: boolean
}

export const AirportDropDownView = ({ dropdownId, title, autofocus }: AirportDropDownViewProps) => {
    const [searchText, setSearchText] = useState<string>("")

    const { isLoading, data: airports } = useFetch<ApiResponse>(ressourceUrl(searchText))

    return (
        <Form.Dropdown
            id={dropdownId}
            title={title}
            onSearchTextChange={(newAirport) => setSearchText(newAirport)}
            isLoading={isLoading}
            autoFocus={autofocus}
            throttle
        >
            {searchText.length > 0 &&
                airports?.results.map((airport) => (
                    <Form.Dropdown.Item
                        key={airport.column_1}
                        value={JSON.stringify({
                            code: airport.column_1,
                            name: airport.airport_name,
                            country: airport.country_code,
                            lat: airport.latitude,
                            lon: airport.longitude,
                        })}
                        title={`[${airport.column_1}] ${airport.airport_name} ${
                            countryList[airport.country_code].flag
                        }`}
                    />
                ))}
        </Form.Dropdown>
    )
}
