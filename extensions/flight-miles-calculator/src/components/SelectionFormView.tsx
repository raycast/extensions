import { Action, ActionPanel, Form, useNavigation } from "@raycast/api"
import { milesValues } from "../ressources/milesValues"
import { AirportDropDownView } from "./AirportDropDownView"
import { ResultView } from "./ResultView"

interface submitValues {
    origin: string
    destination: string
    miles: string
}

export const SelectionFormView = () => {
    const { push } = useNavigation()

    function handleFormSubmit(values: submitValues) {
        const origin = JSON.parse(values.origin)
        const destination = JSON.parse(values.destination)
        const milesPercentage = parseFloat(values.miles)

        push(<ResultView origin={origin} destination={destination} milesPercentage={milesPercentage} />)
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm onSubmit={handleFormSubmit} />
                </ActionPanel>
            }
        >
            <AirportDropDownView dropdownId="origin" title="Origin Airport" autofocus />
            <AirportDropDownView dropdownId="destination" title="Destination Airport" />

            <Form.Separator />

            <Form.Dropdown
                id="miles"
                title="Miles Percentage"
                info="Percentage of miles earned depending on the airline and selected fare class."
                defaultValue="1"
            >
                {milesValues.map((value) => (
                    <Form.Dropdown.Item key={value} value={value.toString()} title={`${value * 100}%`} />
                ))}
            </Form.Dropdown>
        </Form>
    )
}
