import { getPreferenceValues } from "@raycast/api";
import { isArray, isPlainObject, isString } from "lodash";

export type Station = {
  name: string;
  abbr: string;
  city?: string;
};

export type Departure = {
  id: string;
  destination: string;
  minutes: string;
  line: string;
  platform?: string;
  direction?: string;
};

type JsonRecord = Record<string, unknown>;
type StationListResponse = {
  stations: {
    station: unknown[];
  };
};
type DepartureEstimatesResponse = {
  station: unknown[];
};

type Preferences = {
  apiKey?: string;
};

const API_BASE_URL = "https://api.bart.gov/api/";
const REQUEST_TIMEOUT_MS = 10_000;
// Public BART API token used as the default. Users can override it in extension preferences.
const DEFAULT_BART_API_KEY = "ZJAY-5AUJ-9IWT-DWEI";

export class BARTApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BARTApiError";
  }
}

export const getStations = async (): Promise<Station[]> => {
  const { stations: stationList } = await getStationList();
  const stations = stationList.station
    .reduce<Station[]>((validStations, stationValue) => {
      const station = toStation(stationValue);
      if (station) validStations.push(station);
      return validStations;
    }, [])
    .sort((left, right) => left.name.localeCompare(right.name));

  if (stations.length === 0) {
    throw new BARTApiError("BART did not return any stations.");
  }

  return stations;
};

export const getDepartures = async (stationAbbr: string): Promise<Departure[]> => {
  const { station: stations } = await getDepartureEstimates(stationAbbr);
  const departures: Departure[] = [];

  for (const stationValue of stations) {
    const station = asRecord(stationValue);
    if (!station) continue;

    for (const etdValue of asArray(station.etd)) {
      const etd = asRecord(etdValue);
      if (!etd) continue;

      const destination = stringValue(etd.destination) ?? "Unknown destination";
      const destinationAbbr = stringValue(etd.abbreviation) ?? destination;
      const estimates = asArray(etd.estimate);

      estimates.forEach((estimateValue, index) => {
        const estimate = asRecord(estimateValue);
        if (!estimate || stringValue(estimate.cancelflag) === "1") return;

        const minutes = stringValue(estimate.minutes) ?? "Unknown";
        const line = stringValue(estimate.color) ?? "Unknown";
        const platform = stringValue(estimate.platform);
        const direction = stringValue(estimate.direction);

        departures.push({
          id: [stationAbbr, destinationAbbr, minutes, platform ?? "", direction ?? "", line, index].join(":"),
          destination,
          minutes,
          line,
          platform,
          direction,
        });
      });
    }
  }

  return departures.sort((left, right) => {
    const minutesDifference = minutesSortValue(left.minutes) - minutesSortValue(right.minutes);
    return minutesDifference === 0 ? left.destination.localeCompare(right.destination) : minutesDifference;
  });
};

const getStationList = async (): Promise<StationListResponse> => {
  const root = await requestBART("stn.aspx", { cmd: "stns" });
  const stations = asRecord(root.stations);
  const station = arrayValue(stations?.station);

  if (!stations || !station) {
    throw new BARTApiError("BART returned an unexpected station-list response.");
  }

  return { stations: { station } };
};

const getDepartureEstimates = async (stationAbbr: string): Promise<DepartureEstimatesResponse> => {
  const root = await requestBART("etd.aspx", { cmd: "etd", orig: stationAbbr });
  const station = arrayValue(root.station);

  if (!station) {
    throw new BARTApiError("BART returned an unexpected departure-estimates response.");
  }

  return { station };
};

const getApiKey = (): string => {
  const apiKey = getPreferenceValues<Preferences>().apiKey?.trim();
  return apiKey || DEFAULT_BART_API_KEY;
};

const requestBART = async (endpoint: string, parameters: Record<string, string>): Promise<JsonRecord> => {
  const url = new URL(endpoint, API_BASE_URL);
  url.search = new URLSearchParams({ ...parameters, key: getApiKey(), json: "y" }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new BARTApiError(`BART could not complete the request (${response.status}).`);
    }

    const responseBody: unknown = await response.json().catch(() => {
      throw new BARTApiError("BART returned an unreadable response.");
    });
    const root = asRecord(responseBody)?.root;
    const rootRecord = asRecord(root);

    if (!rootRecord) {
      throw new BARTApiError("BART returned an unexpected response.");
    }

    const message = responseMessage(rootRecord.message);
    if (message) {
      throw new BARTApiError(message);
    }

    return rootRecord;
  } catch (error) {
    if (error instanceof BARTApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BARTApiError("BART did not respond within 10 seconds.");
    }

    throw new BARTApiError("Unable to reach BART. Check your internet connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
};

const toStation = (value: unknown): Station | undefined => {
  const station = asRecord(value);
  const name = stringValue(station?.name);
  const abbr = stringValue(station?.abbr);

  if (!name || !abbr) return undefined;

  return { name, abbr, city: stringValue(station?.city) };
};

const asRecord = (value: unknown): JsonRecord | undefined => (isPlainObject(value) ? (value as JsonRecord) : undefined);

const arrayValue = (value: unknown): unknown[] | undefined => (isArray(value) ? value : undefined);

const asArray = (value: unknown): unknown[] => arrayValue(value) ?? [];

const stringValue = (value: unknown): string | undefined => (isString(value) && value.trim() ? value : undefined);

const responseMessage = (value: unknown): string | undefined => {
  if (stringValue(value)) return (value as string).trim();

  const message = asRecord(value);
  const error = stringValue(message?.error) ?? stringValue(message?.message);
  return error?.trim();
};

const minutesSortValue = (minutes: string): number => {
  if (minutes.toLowerCase() === "leaving") return 0;

  const parsed = Number.parseInt(minutes, 10);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};
