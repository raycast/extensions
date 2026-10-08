// Shared flight search utilities

// Constants
export const IATA_CODE_LENGTH = 3;
export const MIN_ADULTS = 1;
export const MAX_ADULTS = 8;

/**
 * Build Skyscanner URL with flight parameters
 */
export function buildSkyscannerURL(params: {
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

  return `https://www.skyscanner.com/transport/flights/${params.origin.toLowerCase()}/${params.destination.toLowerCase()}/${params.departureDate}${returnPart}/?adultsv2=${params.adults}&cabinclass=economy&childrenv2=&ref=raycast&rtn=${isRoundTrip ? "1" : "0"}&preferdirects=false&outboundaltsenabled=false&inboundaltsenabled=false${stopsParam}`;
}

/**
 * Format date from YYYY-MM-DD to YYMMDD for Skyscanner
 */
export function formatDateForSkyscanner(dateStr: string): string {
  const cleaned = dateStr.replace(/-/g, "");
  return cleaned.substring(2);
}

/**
 * Format Date object to YYMMDD for Skyscanner
 */
export function formatDateObjectForSkyscanner(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`.substring(2); // YYYYMMDD -> YYMMDD
}
