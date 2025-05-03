import { List } from "@raycast/api"
import { format } from "date-fns"
import { getDateList } from "../utils/getDateList"

interface CityListDropdownViewProps {
    setCurrentDate: (date: Date) => void
}

export const CityListDropdownView = ({ setCurrentDate }: CityListDropdownViewProps) => {
    const currentDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    const dates = getDateList(currentDate, 12)

    return (
        <List.Dropdown
            tooltip="Select a date"
            defaultValue={currentDate.toISOString()}
            onChange={(newDate) => setCurrentDate(new Date(newDate))}
        >
            {dates.map((date) => (
                <List.Dropdown.Item
                    key={date.toISOString()}
                    title={`${format(date, "yyyy/MM/dd")}${
                        date.toISOString() === currentDate.toISOString() ? " (Today)" : ""
                    }`}
                    value={date.toISOString()}
                />
            ))}
        </List.Dropdown>
    )
}
