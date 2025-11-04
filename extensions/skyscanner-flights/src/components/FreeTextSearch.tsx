import { Action, ActionPanel, Form, Icon, open, Toast, showToast, environment, AI } from "@raycast/api";
import { useState } from "react";
import { searchAirportsLocal, Airport } from "../data/airports";
import { showFailureToast } from "@raycast/utils";
import { trackFlightSearch } from "../utils/analytics";
import { parseFreeTextQuery, ParsedFlight } from "../utils/flightParser";

// Constants
const IATA_CODE_LENGTH = 3;
const MIN_ADULTS = 1;
const MAX_ADULTS = 8;

interface FormValues {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  adults: string;
  stops: string;
}

export default function FreeTextSearch() {
  const [searchText, setSearchText] = useState("");
  const [isParsingQuery, setIsParsingQuery] = useState(false);
  const [showFallbackForm, setShowFallbackForm] = useState(false);
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

  /**
   * Get the first airport's IATA code for Skyscanner
   * Uses individual airport codes, not city codes
   * Example: BOM (Mumbai), GOI (Goa), JFK (New York)
   */
  function getAirportCode(airports: Airport[]): string {
    if (airports.length === 0) return "";
    return airports[0].iata.toUpperCase();
  }

  /**
   * Prefill form fields from parsed flight data
   */
  function prefillFormFromParsedData(parsed: ParsedFlight) {
    if (parsed.originLocation) {
      const originMatches = searchAirportsLocal(parsed.originLocation);
      setOriginAirports(originMatches);
      if (originMatches.length > 0) {
        setSelectedOrigin(originMatches[0].iata);
      }
    }
    if (parsed.destinationLocation) {
      const destinationMatches = searchAirportsLocal(parsed.destinationLocation);
      setDestinationAirports(destinationMatches);
      if (destinationMatches.length > 0) {
        setSelectedDestination(destinationMatches[0].iata);
      }
    }
    if (parsed.departureDate) {
      setDepartureDate(new Date(parsed.departureDate));
    }
    if (parsed.returnDate) {
      setReturnDate(new Date(parsed.returnDate));
    }
    if (parsed.adults) {
      setAdults(parsed.adults.toString());
    }
    if (parsed.stops) {
      setStops(parsed.stops);
    }
  }

  /**
   * Build Skyscanner URL with flight parameters
   */
  function buildSkyscannerURL(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    stops: "any" | "direct" | "multiStop";
  }): string {
    const isRoundTrip = !!params.returnDate;
    const returnPart = isRoundTrip ? `/${params.returnDate}` : "";

    // Build stops parameter
    let stopsParam = "";
    if (params.stops === "direct") {
      stopsParam = "&stops=!oneStop,!twoPlusStops";
    } else if (params.stops === "multiStop") {
      stopsParam = "&stops=!direct";
    }

    return `https://www.skyscanner.com/transport/flights/${params.origin.toLowerCase()}/${params.destination.toLowerCase()}/${params.departureDate}${returnPart}/?adultsv2=${params.adults}&cabinclass=economy&childrenv2=&ref=home&rtn=${isRoundTrip ? "1" : "0"}&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false${stopsParam}`;
  }

  /**
   * Format date from YYYY-MM-DD to YYMMDD for Skyscanner
   */
  function formatDateForSkyscanner(dateStr: string): string {
    const cleaned = dateStr.replace(/-/g, "");
    return cleaned.substring(2);
  }

  /**
   * Format Date object to YYMMDD for Skyscanner
   */
  function formatDateObjectForSkyscanner(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`.substring(2); // YYYYMMDD -> YYMMDD
  }

  async function handleFreeTextSubmit() {
    if (!searchText || searchText.trim().length < 5) {
      await showFailureToast("Please enter a flight search query (e.g., 'New York to London tomorrow')");
      return;
    }

    // Check if user has AI access
    if (!environment.canAccess(AI)) {
      await showFailureToast("AI Access Required");
      setShowFallbackForm(true);
      return;
    }

    setIsParsingQuery(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Parsing your query...",
      });

      const parsed = await parseFreeTextQuery(searchText);

      // Handle parsing errors
      if (parsed.error) {
        prefillFormFromParsedData(parsed);
        await showFailureToast(parsed.error + ". Use manual form below.");
        setIsParsingQuery(false);
        setShowFallbackForm(true);
        return;
      }

      // Validate required fields
      if (!parsed.originLocation || !parsed.destinationLocation || !parsed.departureDate) {
        const missing = [];
        if (!parsed.originLocation) missing.push("origin");
        if (!parsed.destinationLocation) missing.push("destination");
        if (!parsed.departureDate) missing.push("date");

        prefillFormFromParsedData(parsed);
        await showFailureToast(`AI couldn't parse: ${missing.join(", ")}. Try rephrasing or use manual form.`);
        setIsParsingQuery(false);
        setShowFallbackForm(true);
        return;
      }

      // Search for airports based on parsed locations
      const originMatches = searchAirportsLocal(parsed.originLocation);
      const destinationMatches = searchAirportsLocal(parsed.destinationLocation);

      // Check if we found airports
      if (originMatches.length === 0 || destinationMatches.length === 0) {
        prefillFormFromParsedData(parsed);
        setOriginAirports(originMatches);
        setDestinationAirports(destinationMatches);

        if (originMatches.length === 0) {
          await showFailureToast(
            `No airports found for origin: "${parsed.originLocation}". Try using city name or airport code.`,
          );
        } else {
          await showFailureToast(
            `No airports found for destination: "${parsed.destinationLocation}". Try using city name or airport code.`,
          );
        }

        setIsParsingQuery(false);
        setShowFallbackForm(true);
        return;
      }

      // Get airport codes for Skyscanner
      const originCode = getAirportCode(originMatches);
      const destinationCode = getAirportCode(destinationMatches);

      const adultsCount = parsed.adults || 1;
      const departureDate = formatDateForSkyscanner(parsed.departureDate);
      const returnDate = parsed.returnDate ? formatDateForSkyscanner(parsed.returnDate) : undefined;
      const isRoundTrip = !!returnDate;

      // Build Skyscanner URL
      const url = buildSkyscannerURL({
        origin: originCode,
        destination: destinationCode,
        departureDate,
        returnDate,
        adults: adultsCount,
        stops: parsed.stops || "any",
      });

      trackFlightSearch({
        origin: originCode,
        destination: destinationCode,
        tripType: isRoundTrip ? "round-trip" : "one-way",
        adults: adultsCount,
        departureDate,
        returnDate,
      });

      await open(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Skyscanner",
        message: `${originCode}→${destinationCode} | Date: ${departureDate}`,
      });
    } catch {
      await showFailureToast("Failed to parse query");
    } finally {
      setIsParsingQuery(false);
    }
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
      const isRoundTrip = !!returnDate;

      // Build Skyscanner URL
      const url = buildSkyscannerURL({
        origin,
        destination,
        departureDate,
        returnDate,
        adults: adultsCount,
        stops: values.stops as "any" | "direct" | "multiStop",
      });

      trackFlightSearch({
        origin,
        destination,
        tripType: isRoundTrip ? "round-trip" : "one-way",
        adults: adultsCount,
        departureDate,
        returnDate,
      });

      await open(url);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Skyscanner",
        message: "Flight search page opened in browser",
      });
    } catch {
      await showFailureToast("Failed to Open");
    }
  }

  return (
    <Form
      isLoading={isParsingQuery}
      actions={
        <ActionPanel>
          {showFallbackForm ? (
            <>
              <Action.SubmitForm title="Search on Skyscanner" onSubmit={handleFormSubmit} icon={Icon.Globe} />
              <Action
                title="Try AI Parse Again"
                icon={Icon.MagnifyingGlass}
                onAction={handleFreeTextSubmit}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
            </>
          ) : (
            <Action.SubmitForm title="Search Flights" onSubmit={handleFreeTextSubmit} icon={Icon.Airplane} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="freeText"
        title="Where do you want to fly?"
        placeholder="eg. NYC to LA next Monday for 2"
        value={searchText}
        onChange={setSearchText}
        info={
          showFallbackForm
            ? "AI parse failed. Edit your query or use manual form below"
            : "Type in natural language and press Enter (requires Raycast Pro)"
        }
      />

      {showFallbackForm && (
        <>
          <Form.Separator />
          <Form.Description text="⚠️ Fallback to manual entry - Fill the form below:" />

          <Form.Dropdown
            id="origin"
            title="Origin Airport"
            value={selectedOrigin}
            onChange={setSelectedOrigin}
            onSearchTextChange={(text) => {
              if (text.trim().length >= 2) {
                const results = searchAirportsLocal(text);
                setOriginAirports(results);
              } else if (text.trim().length === 0 && originAirports.length > 0) {
                // Keep existing airports if cleared
              }
            }}
            throttle
          >
            {originAirports.length === 0 ? (
              <Form.Dropdown.Item value="" title="Type at least 2 characters to search..." />
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
            value={selectedDestination}
            onChange={setSelectedDestination}
            onSearchTextChange={(text) => {
              if (text.trim().length >= 2) {
                const results = searchAirportsLocal(text);
                setDestinationAirports(results);
              } else if (text.trim().length === 0 && destinationAirports.length > 0) {
                // Keep existing airports if cleared
              }
            }}
            throttle
          >
            {destinationAirports.length === 0 ? (
              <Form.Dropdown.Item value="" title="Type at least 2 characters to search..." />
            ) : (
              destinationAirports.map((airport) => {
                const displayName = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
                return <Form.Dropdown.Item key={airport.iata} value={airport.iata} title={displayName} />;
              })
            )}
          </Form.Dropdown>

          <Form.DatePicker
            id="departureDate"
            title="Departure Date"
            type={Form.DatePicker.Type.Date}
            value={departureDate}
            onChange={setDepartureDate}
          />

          <Form.DatePicker
            id="returnDate"
            title="Return Date (Optional)"
            type={Form.DatePicker.Type.Date}
            value={returnDate}
            onChange={setReturnDate}
          />

          <Form.TextField
            id="adults"
            title="Number of Adults"
            placeholder="1"
            value={adults}
            onChange={setAdults}
            info="Number of adult passengers (1-8)"
          />

          <Form.Dropdown id="stops" title="Stops" value={stops} onChange={setStops} info="Filter by number of stops">
            <Form.Dropdown.Item value="any" title="Any Number of Stops" />
            <Form.Dropdown.Item value="direct" title="Direct Flights Only" />
            <Form.Dropdown.Item value="multiStop" title="Flights with Stops" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
