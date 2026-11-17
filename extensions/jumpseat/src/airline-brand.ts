import type {
  AirlineBrandSummary,
  AirlineSummary,
  FlightSummary,
} from "./api-response";

interface BrandedFlight {
  flight: Pick<FlightSummary, "airlineBrand">;
  airline: AirlineSummary;
}

interface FlightBrand {
  flight: Pick<FlightSummary, "id" | "airlineId" | "airlineBrand">;
}

// A past or scheduled brand replaces the airline's name and logo. A brand
// without a logo yields null logos (the fallback icon), never the airline's
// current logo. The current brand, an unknown kind or an absent field keep the
// airline as it is.
export function flightAirline(flight: BrandedFlight): AirlineSummary {
  const brand = flight.flight.airlineBrand;
  if (!brand || (brand.kind !== "past" && brand.kind !== "scheduled")) {
    return flight.airline;
  }
  return {
    iata: flight.airline.iata,
    name: brand.name?.trim() || flight.airline.name,
    logoUrl: brand.logoUrl,
    logoDarkUrl: brand.logoDarkUrl,
  };
}

export function flightAirlineName(flight: BrandedFlight): string | null {
  return flightAirline(flight).name?.trim() || null;
}

export function flightAirlineKeywords(flight: BrandedFlight): string[] {
  const names = [flightAirline(flight).name, flight.airline.name];
  return [...new Set(names)];
}

// The server omits airlineBrand while its brand cache is not loaded. Keep the
// brand last seen for the same flight and the same marketing airline until a
// response states it again; an explicit brand, including "current", replaces
// it. A brand from before the flight moved to another airline is dropped.
export function retainAirlineBrands<T extends FlightBrand>(
  previous: readonly FlightBrand[] | undefined,
  next: T[],
): T[] {
  const known = new Map<string, AirlineBrandSummary>();
  for (const flight of previous ?? []) {
    if (flight.flight.airlineBrand) {
      known.set(flight.flight.id, flight.flight.airlineBrand);
    }
  }
  if (known.size === 0) return next;
  return next.map((flight) => {
    if (flight.flight.airlineBrand !== undefined) return flight;
    const airlineBrand = known.get(flight.flight.id);
    return airlineBrand?.airlineId &&
      airlineBrand.airlineId === flight.flight.airlineId
      ? { ...flight, flight: { ...flight.flight, airlineBrand } }
      : flight;
  });
}
