import { PRIMDeparturesResponse, ParsedDeparture, Departure, PRIMStopAreasResponse, StopAreaFull } from "./types";
import { parseDateTime, getMinutesUntil } from "../utils/time";

const BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia";

export class PRIMAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "PRIMAPIError";
  }
}

export async function fetchDepartures(
  stopId: string,
  apiKey: string,
  count: number = 20,
): Promise<PRIMDeparturesResponse> {
  const formattedStopId = stopId.startsWith("stop_area:") ? stopId : `stop_area:IDFM:${stopId}`;

  const url = `${BASE_URL}/stop_areas/${encodeURIComponent(formattedStopId)}/departures?count=${count}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new PRIMAPIError("Invalid API key. Please check your PRIM API key in preferences.", 401);
    }
    if (response.status === 404) {
      throw new PRIMAPIError("Stop not found. Please check your Stop ID in preferences.", 404);
    }
    if (response.status === 429) {
      throw new PRIMAPIError("Rate limit exceeded. Please try again later.", 429);
    }
    throw new PRIMAPIError(`API request failed: ${response.statusText}`, response.status);
  }

  const data = (await response.json()) as PRIMDeparturesResponse;
  return data;
}

export function parseDepartures(departures: Departure[], lineFilter?: string): ParsedDeparture[] {
  return departures
    .map((departure, index) => {
      const departureTime = parseDateTime(departure.stop_date_time.departure_date_time);
      const minutesUntil = getMinutesUntil(departureTime);

      return {
        id: `${departure.route.id}-${index}-${departure.stop_date_time.departure_date_time}`,
        lineName: departure.display_informations.name || departure.display_informations.label,
        lineCode: departure.display_informations.code,
        lineColor: departure.display_informations.color,
        textColor: departure.display_informations.text_color,
        direction: departure.display_informations.direction,
        departureTime,
        minutesUntil,
        isRealTime: departure.stop_date_time.data_freshness === "realtime",
        network: departure.display_informations.network,
        physicalMode: departure.display_informations.physical_mode,
      };
    })
    .filter((departure) => {
      if (departure.minutesUntil < 0) return false;
      if (departure.physicalMode.toLowerCase() !== "métro") return false;

      if (lineFilter && lineFilter.trim()) {
        const filter = lineFilter.toLowerCase().trim();
        return departure.lineCode.toLowerCase().includes(filter) || departure.lineName.toLowerCase().includes(filter);
      }

      return true;
    })
    .sort((a, b) => a.minutesUntil - b.minutesUntil);
}

export function groupDeparturesByLine(departures: ParsedDeparture[]): Map<string, ParsedDeparture[]> {
  const grouped = new Map<string, ParsedDeparture[]>();

  for (const departure of departures) {
    const key = `${departure.lineCode}-${departure.direction}`;
    const existing = grouped.get(key) || [];
    existing.push(departure);
    grouped.set(key, existing);
  }

  return grouped;
}

export function getLineColor(colorHex: string): string {
  if (!colorHex) return "#666666";
  return colorHex.startsWith("#") ? colorHex : `#${colorHex}`;
}

// Paris Metro line IDs and colors
export const METRO_LINES: MetroLine[] = [
  { id: "line:IDFM:C01371", code: "1", name: "Métro 1", color: "FFCD00" },
  { id: "line:IDFM:C01372", code: "2", name: "Métro 2", color: "003CA6" },
  { id: "line:IDFM:C01373", code: "3", name: "Métro 3", color: "837902" },
  { id: "line:IDFM:C01374", code: "4", name: "Métro 4", color: "CF009E" },
  { id: "line:IDFM:C01375", code: "5", name: "Métro 5", color: "FF7E2E" },
  { id: "line:IDFM:C01376", code: "6", name: "Métro 6", color: "6ECA97" },
  { id: "line:IDFM:C01377", code: "7", name: "Métro 7", color: "FA9ABA" },
  { id: "line:IDFM:C01378", code: "8", name: "Métro 8", color: "E19BDF" },
  { id: "line:IDFM:C01379", code: "9", name: "Métro 9", color: "B6BD00" },
  { id: "line:IDFM:C01380", code: "10", name: "Métro 10", color: "C9910D" },
  { id: "line:IDFM:C01381", code: "11", name: "Métro 11", color: "704B1C" },
  { id: "line:IDFM:C01382", code: "12", name: "Métro 12", color: "007852" },
  { id: "line:IDFM:C01383", code: "13", name: "Métro 13", color: "6EC4E8" },
  { id: "line:IDFM:C01384", code: "14", name: "Métro 14", color: "62259D" },
];

export interface MetroLine {
  id: string;
  code: string;
  name: string;
  color: string;
}

export function getMetroLines(): MetroLine[] {
  return METRO_LINES;
}

export async function fetchStopsForLine(lineId: string, apiKey: string): Promise<StopAreaFull[]> {
  const url = `${BASE_URL}/lines/${encodeURIComponent(lineId)}/stop_areas?count=100`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new PRIMAPIError("Invalid API key. Please check your PRIM API key in preferences.", 401);
    }
    if (response.status === 404) {
      throw new PRIMAPIError("Line not found.", 404);
    }
    throw new PRIMAPIError(`API request failed: ${response.statusText}`, response.status);
  }

  const data = (await response.json()) as PRIMStopAreasResponse;

  return data.stop_areas.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function fetchDirectionsForStop(stopId: string, apiKey: string, lineCode: string): Promise<string[]> {
  const data = await fetchDepartures(stopId, apiKey, 50);

  const directions = new Set<string>();
  for (const departure of data.departures) {
    if (departure.display_informations.code === lineCode) {
      directions.add(departure.display_informations.direction);
    }
  }

  return Array.from(directions).sort((a, b) => a.localeCompare(b, "fr"));
}
