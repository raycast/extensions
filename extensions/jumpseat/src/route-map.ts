export type RouteMapTheme = "light" | "dark";

const IATA_CODE_PATTERN = /^[A-Z]{3}$/;

export function buildRouteMapUrl(input: {
  apiBaseUrl: string;
  departureIata: string | null | undefined;
  arrivalIata: string | null | undefined;
  theme: RouteMapTheme;
}): string | undefined {
  const departure = input.departureIata?.trim().toUpperCase();
  const arrival = input.arrivalIata?.trim().toUpperCase();
  if (
    !departure ||
    !arrival ||
    departure === arrival ||
    !IATA_CODE_PATTERN.test(departure) ||
    !IATA_CODE_PATTERN.test(arrival)
  ) {
    return undefined;
  }
  const [firstAirport, secondAirport] = [departure, arrival].sort();

  const url = new URL(
    `/api/v1/route-maps/v1/${input.theme}/${firstAirport}/${secondAirport}.png`,
    input.apiBaseUrl,
  );
  url.searchParams.set("raycast-width", "420");
  url.searchParams.set("raycast-height", "189");
  url.searchParams.set("framing", "compact");
  return url.toString();
}
