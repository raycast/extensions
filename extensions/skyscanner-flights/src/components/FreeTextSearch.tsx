import { Action, ActionPanel, Form, Icon, Toast, showToast, environment, AI } from "@raycast/api";
import { useState } from "react";
import { searchAirportsLocal, Airport, preprocessIATACodes, getCodeForSkyscanner } from "../data/airports";
import { showFailureToast } from "@raycast/utils";
import { parseFreeTextQuery, ParsedFlight } from "../utils/flightParser";
import {
  formatDateForSkyscanner,
  formatDateObjectForSkyscanner,
  IATA_CODE_LENGTH,
  MIN_ADULTS,
  MAX_ADULTS,
} from "../utils/flightUtils";
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

  async function handleFallback(message: string) {
    await showFailureToast(message);
    setShowFallbackForm(true);
    setIsParsingQuery(false);
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

  function handleOriginSearch(text: string) {
    const results = searchAirportsLocal(text);
    setOriginAirports(results);
  }

  function handleDestinationSearch(text: string) {
    const results = searchAirportsLocal(text);
    setDestinationAirports(results);
  }

  async function handleFreeTextSubmit() {
    if (!searchText || searchText.trim().length < 5) {
      await showFailureToast("Please enter a flight search query (e.g., 'New York to London tomorrow')");
      return;
    }

    setIsParsingQuery(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Looking for flights...",
      });

      // Step 1: Try to pre-process for IATA codes
      const preprocessed = preprocessIATACodes(searchText);

      if (preprocessed.fullMatch && preprocessed.originCode && preprocessed.destinationCode) {
        // IATA codes detected and validated - use direct code path
        const originCode = preprocessed.originCode;
        const destinationCode = preprocessed.destinationCode;

        // Parse remaining text for dates and parameters
        // Check if user has AI access for date parsing
        let parsed: ParsedFlight;
        if (environment.canAccess(AI)) {
          parsed = await parseFreeTextQuery(preprocessed.remainingQuery);
        } else {
          // No AI access - use defaults
          parsed = {
            adults: 1,
            stops: "any",
            departureDate: new Date().toISOString().split("T")[0], // today
          };
        }

        // Show failure if origin and destination are the same
        if (originCode === destinationCode) {
          await handleFallback("Same origin and destination");
          return;
        }

        // Validate we have a departure date
        if (!parsed.departureDate) {
          parsed.departureDate = new Date().toISOString().split("T")[0]; // Default to today
        }

        const adultsCount = parsed.adults || 1;
        const departureDate = formatDateForSkyscanner(parsed.departureDate);
        const returnDate = parsed.returnDate ? formatDateForSkyscanner(parsed.returnDate) : undefined;

        // Build and open URL with exact codes provided by user
        await buildAndOpenSkyscannerURL({
          origin: originCode,
          destination: destinationCode,
          departureDate,
          returnDate,
          adults: adultsCount,
          stops: parsed.stops || "any",
        });

        setIsParsingQuery(false);
        return;
      }

      // Step 2: Fall back to AI-based parsing for city names
      // Check if user has AI access
      if (!environment.canAccess(AI)) {
        await handleFallback("AI Access Required");
        return;
      }

      const parsed = await parseFreeTextQuery(searchText);

      // Handle parsing errors
      if (parsed.error) {
        prefillFormFromParsedData(parsed);
        await handleFallback(parsed.error + ". Use manual form below.");
        return;
      }

      // Validate required fields
      if (!parsed.originLocation || !parsed.destinationLocation || !parsed.departureDate) {
        const missing = [];
        if (!parsed.originLocation) missing.push("origin");
        if (!parsed.destinationLocation) missing.push("destination");
        if (!parsed.departureDate) missing.push("date");

        prefillFormFromParsedData(parsed);
        await showFailureToast(`AI couldn't parse: ${missing.join(", ")}. Check form below or rephrase.`);
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
          await handleFallback(
            `No airports found for origin: "${parsed.originLocation}". Try using city name or airport code.`,
          );
        } else {
          await handleFallback(
            `No airports found for destination: "${parsed.destinationLocation}". Try using city name or airport code.`,
          );
        }

        return;
      }

      // Get codes for Skyscanner (city code if multiple airports, else airport code)
      const originCode = getCodeForSkyscanner(parsed.originLocation, originMatches);
      const destinationCode = getCodeForSkyscanner(parsed.destinationLocation, destinationMatches);

      // Validate that we got valid codes
      if (!originCode || !destinationCode) {
        const missing = [];
        if (!originCode) missing.push("origin code");
        if (!destinationCode) missing.push("destination code");

        prefillFormFromParsedData(parsed);
        await handleFallback(`Failed to get ${missing.join(", ")}. Check form below.`);
        return;
      }

      const adultsCount = parsed.adults || 1;
      const departureDate = formatDateForSkyscanner(parsed.departureDate);
      const returnDate = parsed.returnDate ? formatDateForSkyscanner(parsed.returnDate) : undefined;

      // Build and open URL
      await buildAndOpenSkyscannerURL({
        origin: originCode,
        destination: destinationCode,
        departureDate,
        returnDate,
        adults: adultsCount,
        stops: parsed.stops || "any",
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

      // Build and open URL
      await buildAndOpenSkyscannerURL({
        origin,
        destination,
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
      isLoading={isParsingQuery}
      actions={
        <ActionPanel>
          {showFallbackForm ? (
            <>
              <Action.SubmitForm title="Search on Skyscanner" onSubmit={handleFormSubmit} icon={Icon.Globe} />
              <Action title="Try AI Parse Again" icon={Icon.MagnifyingGlass} onAction={handleFreeTextSubmit} />
            </>
          ) : (
            <Action.SubmitForm title="Search Flights" onSubmit={handleFreeTextSubmit} icon={Icon.Airplane} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="freeText"
        title="Where are we going?"
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
        </>
      )}
    </Form>
  );
}
