import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { searchAirportsLocal, Airport } from "../data/airports";
import { formatDateObjectForSkyscanner, IATA_CODE_LENGTH, MIN_ADULTS, MAX_ADULTS } from "../utils/flightUtils";
import FlightSearchForm from "./FlightSearchForm";
import { buildAndOpenSkyscannerURL } from "../utils/ui";

interface FormValues {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  adults: string;
  stops: string;
}

export default function ManualFormSearch() {
  const [originAirports, setOriginAirports] = useState<Airport[]>([]);
  const [destinationAirports, setDestinationAirports] = useState<Airport[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [adults, setAdults] = useState<string>("1");
  const [stops, setStops] = useState<string>("any");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function handleOriginSearch(text: string) {
    const results = searchAirportsLocal(text);
    setOriginAirports(results);
  }

  function handleDestinationSearch(text: string) {
    const results = searchAirportsLocal(text);
    setDestinationAirports(results);
  }

  async function handleFormSubmit(values: FormValues) {
    const origin = values.origin.toUpperCase().trim();
    const destination = values.destination.toUpperCase().trim();
    const adultsCount = parseInt(values.adults);

    // Validation
    if (!origin || origin.length !== IATA_CODE_LENGTH) {
      await showFailureToast("Please select a valid origin airport");
      return;
    }

    if (!destination || destination.length !== IATA_CODE_LENGTH) {
      await showFailureToast("Please select a valid destination airport");
      return;
    }

    if (isNaN(adultsCount) || adultsCount < MIN_ADULTS || adultsCount > MAX_ADULTS) {
      await showFailureToast(`Please enter a number between ${MIN_ADULTS} and ${MAX_ADULTS}`);
      return;
    }

    // Validate departure date is not in the past
    const departureDateObj = new Date(values.departureDate);
    departureDateObj.setHours(0, 0, 0, 0);
    if (departureDateObj < today) {
      await showFailureToast("Departure date must be in the future");
      return;
    }

    // Validate return date if provided
    if (values.returnDate) {
      const returnDateObj = new Date(values.returnDate);
      returnDateObj.setHours(0, 0, 0, 0);
      if (returnDateObj < departureDateObj) {
        await showFailureToast("Return date must be after departure date");
        return;
      }
    }

    try {
      const departureDate = formatDateObjectForSkyscanner(values.departureDate);
      const returnDate = values.returnDate ? formatDateObjectForSkyscanner(values.returnDate) : undefined;

      // Build and open URL with exact codes provided by user
      await buildAndOpenSkyscannerURL({
        origin: origin,
        destination: destination,
        departureDate,
        returnDate,
        adults: adultsCount,
        stops: values.stops as "any" | "direct" | "multiStop",
      });
    } catch {
      await showFailureToast("Failed to Open");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search on Skyscanner" onSubmit={handleFormSubmit} icon={Icon.Globe} />
        </ActionPanel>
      }
    >
      <FlightSearchForm
        originAirports={originAirports}
        destinationAirports={destinationAirports}
        selectedOrigin={selectedOrigin}
        selectedDestination={selectedDestination}
        departureDate={departureDate}
        returnDate={returnDate}
        adults={adults}
        stops={stops}
        onOriginChange={setSelectedOrigin}
        onDestinationChange={setSelectedDestination}
        onOriginSearch={handleOriginSearch}
        onDestinationSearch={handleDestinationSearch}
        onDepartureDateChange={setDepartureDate}
        onReturnDateChange={setReturnDate}
        onAdultsChange={setAdults}
        onStopsChange={setStops}
      />
    </Form>
  );
}
