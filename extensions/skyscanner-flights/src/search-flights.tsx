import { Action, ActionPanel, Form, Icon, open, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { searchAirportsLocal, Airport } from "./data/airports";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  origin: string;
  destination: string;
  date: Date;
  adults: string;
  returnDate?: Date;
}

export default function OpenSkyscanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [originSearchText, setOriginSearchText] = useState("");
  const [destinationSearchText, setDestinationSearchText] = useState("");
  const [originAirports, setOriginAirports] = useState<Airport[]>([]);
  const [destinationAirports, setDestinationAirports] = useState<Airport[]>([]);

  // Get today's date for minimum date validation
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function handleOriginSearch(text: string) {
    setOriginSearchText(text);
    if (text.trim().length >= 2) {
      const results = searchAirportsLocal(text);
      setOriginAirports(results);
    } else {
      setOriginAirports([]);
    }
  }

  function handleDestinationSearch(text: string) {
    setDestinationSearchText(text);
    if (text.trim().length >= 2) {
      const results = searchAirportsLocal(text);
      setDestinationAirports(results);
    } else {
      setDestinationAirports([]);
    }
  }

  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  async function handleSubmit(values: FormValues) {
    const origin = values.origin.toUpperCase().trim();
    const destination = values.destination.toUpperCase().trim();
    const adults = parseInt(values.adults);

    // Validation
    if (!origin || origin.length !== 3) {
      await showFailureToast("Please enter a valid 3-letter airport code (e.g., JFK)");
      return;
    }

    if (!destination || destination.length !== 3) {
      await showFailureToast("Please enter a valid 3-letter airport code (e.g., LAX)");
      return;
    }

    if (isNaN(adults) || adults < 1 || adults > 8) {
      await showFailureToast("Please enter a number between 1 and 8");
      return;
    }

    // Validate departure date is not in the past
    const departureDate = new Date(values.date);
    departureDate.setHours(0, 0, 0, 0);
    if (departureDate < today) {
      await showFailureToast("Departure date must be in the future");
      return;
    }

    // Validate return date if provided
    if (values.returnDate) {
      const returnDate = new Date(values.returnDate);
      returnDate.setHours(0, 0, 0, 0);
      if (returnDate < departureDate) {
        await showFailureToast("Return date must be after departure date");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Automatically determine trip type based on return date
      const isRoundTrip = !!values.returnDate;

      // Build Skyscanner URL
      const formattedDate = formatDate(values.date);
      const returnPart = isRoundTrip ? `/${formatDate(values.returnDate!)}` : "";

      const url = `https://www.skyscanner.com/transport/flights/${origin}/${destination}/${formattedDate}${returnPart}/?adults=${adults}&adultsv2=${adults}&cabinclass=economy&children=0&childrenv2=&inboundaltsenabled=false&infants=0&outboundaltsenabled=false&preferdirects=false&ref=home&rtn=${isRoundTrip ? "1" : "0"}`;

      // Open URL in browser
      await open(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Skyscanner",
        message: "Flight search page opened in browser",
      });
    } catch {
      await showFailureToast("Failed to Open");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open in Skyscanner" onSubmit={handleSubmit} icon={Icon.Globe} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="origin"
        title="Origin Airport"
        placeholder="Search for airport..."
        info="Type to search for airports (e.g., New York, JFK)"
        onSearchTextChange={handleOriginSearch}
        throttle
        autoFocus
      >
        {originAirports.length === 0 && originSearchText.trim().length >= 2 ? (
          <Form.Dropdown.Item value="" title="No airports found" />
        ) : (
          originAirports.map((airport) => {
            const displayName = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
            return <Form.Dropdown.Item key={airport.iata} value={airport.iata} title={displayName} />;
          })
        )}
      </Form.Dropdown>

      <Form.Dropdown
        id="destination"
        title="Destination Airport"
        placeholder="Search for airport..."
        info="Type to search for airports (e.g., Los Angeles, LAX)"
        onSearchTextChange={handleDestinationSearch}
        throttle
      >
        {destinationAirports.length === 0 && destinationSearchText.trim().length >= 2 ? (
          <Form.Dropdown.Item value="" title="No airports found" />
        ) : (
          destinationAirports.map((airport) => {
            const displayName = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
            return <Form.Dropdown.Item key={airport.iata} value={airport.iata} title={displayName} />;
          })
        )}
      </Form.Dropdown>

      <Form.DatePicker
        id="date"
        title="Departure Date"
        type={Form.DatePicker.Type.Date}
        info="Select your departure date"
      />

      <Form.DatePicker
        id="returnDate"
        title="Return Date (Optional)"
        type={Form.DatePicker.Type.Date}
        info="Leave empty for one-way, fill for round-trip"
      />

      <Form.TextField
        id="adults"
        title="Number of Adults"
        placeholder="1"
        defaultValue="1"
        info="Number of adult passengers (1-8)"
      />
    </Form>
  );
}
