import { Action, ActionPanel, Form, Icon, open, Toast, showToast, environment, AI } from "@raycast/api";
import { useState } from "react";
import { searchAirportsLocal, Airport, getAirportByIATA } from "../data/airports";
import { showFailureToast } from "@raycast/utils";
import { trackFlightSearch } from "../utils/analytics";
import { parseFreeTextQuery, ParsedFlight } from "../utils/flightParser";
import {
  buildSkyscannerURL,
  formatDateForSkyscanner,
  formatDateObjectForSkyscanner,
  IATA_CODE_LENGTH,
  MIN_ADULTS,
  MAX_ADULTS,
} from "../utils/flightUtils";
import FlightSearchForm from "./FlightSearchForm";
import { getCityCode, hasMultipleAirports } from "../data/multiAirportCities";

interface FormValues {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  adults: string;
  stops: string;
}

interface PreProcessedQuery {
  originCode?: string; // Valid IATA code
  destinationCode?: string; // Valid IATA code
  remainingQuery: string; // Text for AI to parse
  fullMatch: boolean; // Whether both codes were found and validated
}

/**
 * Pre-process query to detect and validate IATA codes
 * Handles patterns like: "AAL to CPH", "JFK-LAX", "SFO → NRT"
 * @param query - User's free text query
 * @returns PreProcessedQuery object with codes and remaining text
 */
function preprocessIATACodes(query: string): PreProcessedQuery {
  // Regex to match patterns like "XXX to YYY", "XXX-YYY", "XXX → YYY"
  // Matches 3-letter codes separated by common delimiters
  const pattern = /\b([A-Z]{3})\b[\s-→>]*(?:to|->|→)?[\s-→>]*\b([A-Z]{3})\b/i;
  const match = query.match(pattern);

  if (!match) {
    return { remainingQuery: query, fullMatch: false };
  }

  const originCode = match[1].toUpperCase();
  const destinationCode = match[2].toUpperCase();

  // CRITICAL: Validate against actual airport database to prevent false positives
  // (e.g., "USA to CPH", "New to Old", etc.)
  const originAirport = getAirportByIATA(originCode);
  const destinationAirport = getAirportByIATA(destinationCode);

  if (!originAirport || !destinationAirport) {
    // Invalid codes - fall back to AI parsing
    return { remainingQuery: query, fullMatch: false };
  }

  // Check if origin and destination are the same
  if (originCode === destinationCode) {
    // Allow but will show warning later
    // Still considered a full match
  }

  // Extract remaining query (everything except the matched codes)
  const remainingQuery = query.replace(match[0], "").trim();

  return {
    originCode,
    destinationCode,
    remainingQuery: remainingQuery || "today", // Default to "today" if nothing left
    fullMatch: true,
  };
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
   * Get the appropriate code for Skyscanner
   * Flow:
   * 1. AI parses city name
   * 2. Check if city has multiple airports
   * 3. If true → use city code
   * 4. If false → use airport code of the city
   * 5. Construct URL
   *
   * @param cityName - The parsed city name from AI
   * @param airportMatches - Airports found matching the city
   * @returns City code or airport code
   */
  function getCodeForSkyscanner(cityName: string, airportMatches: Airport[]): string {
    if (airportMatches.length === 0) return "";

    // Strategy: Prioritize cities that have multiple airports and city codes
    // This handles cases like "London" matching both London, Canada and London, UK
    // We want London, UK (which has LON city code) over London, Canada (single airport)

    let selectedAirport = airportMatches[0];
    let selectedCity = selectedAirport.city;
    let selectedCountry = selectedAirport.country;

    // Check all matching airports and prioritize those with city codes
    for (const airport of airportMatches) {
      const hasMultiple = hasMultipleAirports(airport.city, airport.country);
      const cityCode = getCityCode(airport.city, airport.country);

      // If this city has multiple airports AND a city code, prefer it
      if (hasMultiple && cityCode) {
        selectedAirport = airport;
        selectedCity = airport.city;
        selectedCountry = airport.country;
        break; // Use the first match with a city code
      }
    }

    // Check if the selected city has multiple airports
    const hasMultiple = hasMultipleAirports(selectedCity, selectedCountry);

    if (hasMultiple) {
      // Use city code
      const cityCode = getCityCode(selectedCity, selectedCountry);
      if (cityCode) {
        return cityCode.toUpperCase();
      }
    }

    // Use airport code of the city
    return selectedAirport.iata.toUpperCase();
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

        // Show warning if origin and destination are the same
        if (originCode === destinationCode) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Same origin and destination",
            message: "Searching anyway...",
          });
        }

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

        // Validate we have a departure date
        if (!parsed.departureDate) {
          parsed.departureDate = new Date().toISOString().split("T")[0]; // Default to today
        }

        const adultsCount = parsed.adults || 1;
        const departureDate = formatDateForSkyscanner(parsed.departureDate);
        const returnDate = parsed.returnDate ? formatDateForSkyscanner(parsed.returnDate) : undefined;
        const isRoundTrip = !!returnDate;

        // Build Skyscanner URL with exact codes provided by user
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

        setIsParsingQuery(false);
        return;
      }

      // Step 2: Fall back to AI-based parsing for city names
      // Check if user has AI access
      if (!environment.canAccess(AI)) {
        await showFailureToast("AI Access Required");
        setShowFallbackForm(true);
        setIsParsingQuery(false);
        return;
      }

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

      // Get codes for Skyscanner (city code if multiple airports, else airport code)
      const originCode = getCodeForSkyscanner(parsed.originLocation, originMatches);
      const destinationCode = getCodeForSkyscanner(parsed.destinationLocation, destinationMatches);

      // Validate that we got valid codes
      if (!originCode || !destinationCode) {
        const missing = [];
        if (!originCode) missing.push("origin code");
        if (!destinationCode) missing.push("destination code");

        prefillFormFromParsedData(parsed);
        await showFailureToast(`Failed to get ${missing.join(", ")}. Check form below.`);
        setIsParsingQuery(false);
        setShowFallbackForm(true);
        return;
      }

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
