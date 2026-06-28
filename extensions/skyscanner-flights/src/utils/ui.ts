import { open, Toast, showToast } from "@raycast/api";
import { trackFlightSearch } from "./analytics";
import { buildSkyscannerURL } from "./flightUtils";

/**
 * Build URL, track search, and open in browser
 */
export async function buildAndOpenSkyscannerURL(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  stops: "any" | "direct" | "multiStop";
  originalQuery?: string;
  usedAIParsing?: boolean;
}) {
  const isRoundTrip = !!params.returnDate;

  // Build Skyscanner URL
  const url = buildSkyscannerURL(params);

  // Track analytics
  trackFlightSearch({
    origin: params.origin,
    destination: params.destination,
    tripType: isRoundTrip ? "round-trip" : "one-way",
    adults: params.adults,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    originalQuery: params.originalQuery,
    usedAIParsing: params.usedAIParsing,
  });

  // Open URL
  await open(url);

  // Show success toast
  await showToast({
    style: Toast.Style.Success,
    title: "Opening Skyscanner",
    message: `${params.origin.toUpperCase()}→${params.destination.toUpperCase()} | Date: ${params.departureDate}`,
  });
}
