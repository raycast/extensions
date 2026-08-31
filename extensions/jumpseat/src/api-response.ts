export interface AirportSummary {
  iata: string | null;
  icao: string | null;
  name: string;
  city: string | null;
  country: string | null;
  countryFlagUrl?: string | null;
  timeZoneRegionName: string | null;
}

export interface AirlineSummary {
  iata: string | null;
  name: string;
  logoUrl?: string | null;
}

export interface FlightSummary {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string | null;
  estimatedDepartureTime: string | null;
  estimatedArrivalTime: string | null;
  actualGateDepartureTime?: string | null;
  actualTakeoffTime?: string | null;
  actualLandingTime?: string | null;
  actualGateArrivalTime?: string | null;
  departureGate: string | null;
  arrivalGate: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  checkIn?: string | null;
  belt?: string | null;
  aircraftName: string | null;
  aircraftDisplayName?: string | null;
  aircraftExactModelName?: string | null;
  aircraftManufacturer?: string | null;
  aircraftEquipmentCode?: string | null;
  aircraftResolvedEquipmentCode?: string | null;
  aircraftRegistration: string | null;
  aircraftShipName: string | null;
  flightState: string | null;
  boardState: string | null;
  flightPhase: string | null;
  onTimeStatus: string | null;
}

export interface UpcomingFlight {
  flight: FlightSummary;
  airline: AirlineSummary;
  departureAirport: AirportSummary;
  arrivalAirport: AirportSummary | null;
  seatNumber: string | null;
  seatCabinClass: string | null;
  seatPosition: string | null;
  bookingNumber: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoundedString(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= maximum
  );
}

function isNullableString(
  value: unknown,
  maximum: number,
): value is string | null {
  return (
    value === null || (typeof value === "string" && value.length <= maximum)
  );
}

function isOptionalNullableString(value: unknown, maximum: number): boolean {
  return value === undefined || isNullableString(value, maximum);
}

function isDateString(value: unknown): value is string {
  return isBoundedString(value, 64) && Number.isFinite(Date.parse(value));
}

function isNullableDateString(value: unknown): value is string | null {
  return value === null || isDateString(value);
}

function isOptionalNullableDateString(value: unknown): boolean {
  return value === undefined || isNullableDateString(value);
}

function isNullableTimeZone(value: unknown): value is string | null {
  if (value === null) return true;
  if (!isBoundedString(value, 128)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isAirportSummary(value: unknown): value is AirportSummary {
  if (!isRecord(value)) return false;
  return (
    isNullableString(value.iata, 8) &&
    isNullableString(value.icao, 8) &&
    isBoundedString(value.name, 256) &&
    isNullableString(value.city, 128) &&
    isNullableString(value.country, 128) &&
    isOptionalNullableString(value.countryFlagUrl, 2_048) &&
    isNullableTimeZone(value.timeZoneRegionName)
  );
}

function isAirlineSummary(value: unknown): value is AirlineSummary {
  if (!isRecord(value)) return false;
  return (
    isNullableString(value.iata, 8) &&
    isBoundedString(value.name, 256) &&
    isOptionalNullableString(value.logoUrl, 2_048)
  );
}

function isFlightSummary(value: unknown): value is FlightSummary {
  if (!isRecord(value)) return false;
  return (
    isBoundedString(value.id, 36) &&
    UUID_PATTERN.test(value.id) &&
    isBoundedString(value.flightNumber, 32) &&
    isDateString(value.departureTime) &&
    isNullableDateString(value.arrivalTime) &&
    isNullableDateString(value.estimatedDepartureTime) &&
    isNullableDateString(value.estimatedArrivalTime) &&
    isOptionalNullableDateString(value.actualGateDepartureTime) &&
    isOptionalNullableDateString(value.actualTakeoffTime) &&
    isOptionalNullableDateString(value.actualLandingTime) &&
    isOptionalNullableDateString(value.actualGateArrivalTime) &&
    isNullableString(value.departureGate, 32) &&
    isNullableString(value.arrivalGate, 32) &&
    isNullableString(value.departureTerminal, 64) &&
    isNullableString(value.arrivalTerminal, 64) &&
    isOptionalNullableString(value.checkIn, 128) &&
    isOptionalNullableString(value.belt, 64) &&
    isNullableString(value.aircraftName, 256) &&
    isOptionalNullableString(value.aircraftDisplayName, 256) &&
    isOptionalNullableString(value.aircraftExactModelName, 256) &&
    isOptionalNullableString(value.aircraftManufacturer, 256) &&
    isOptionalNullableString(value.aircraftEquipmentCode, 32) &&
    isOptionalNullableString(value.aircraftResolvedEquipmentCode, 32) &&
    isNullableString(value.aircraftRegistration, 32) &&
    isNullableString(value.aircraftShipName, 256) &&
    isNullableString(value.flightState, 64) &&
    isNullableString(value.boardState, 64) &&
    isNullableString(value.flightPhase, 64) &&
    isNullableString(value.onTimeStatus, 64)
  );
}

function isUpcomingFlight(value: unknown): value is UpcomingFlight {
  if (!isRecord(value)) return false;
  return (
    isFlightSummary(value.flight) &&
    isAirlineSummary(value.airline) &&
    isAirportSummary(value.departureAirport) &&
    (value.arrivalAirport === null || isAirportSummary(value.arrivalAirport)) &&
    isNullableString(value.seatNumber, 32) &&
    isNullableString(value.seatCabinClass, 64) &&
    isNullableString(value.seatPosition, 64) &&
    isNullableString(value.bookingNumber, 128)
  );
}

export function parseUpcomingFlightsResponse(
  body: unknown,
): UpcomingFlight[] | null {
  if (
    !isRecord(body) ||
    !Array.isArray(body.flights) ||
    body.flights.length > 100
  ) {
    return null;
  }
  return body.flights.every(isUpcomingFlight) ? body.flights : null;
}
