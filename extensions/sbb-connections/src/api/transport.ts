import { showToast, Toast } from "@raycast/api";
import type { Connection, Station } from "../types";

const BASE_URL = "https://transport.opendata.ch/v1";

type LocationsResponse = {
  stations: Array<{
    id: string;
    name: string;
  }>;
};

type ConnectionsResponse = {
  connections: Connection[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

export async function searchLocations(query: string): Promise<Station[]> {
  if (query.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ query, type: "station" });
  const data = await fetchJson<LocationsResponse>(
    `${BASE_URL}/locations?${params}`,
  );
  return data.stations
    .filter((station) => station.id && station.name)
    .map((station) => ({
      id: String(station.id),
      name: String(station.name),
    }));
}

export async function searchConnections(params: {
  fromId: string;
  toId: string;
  date: string;
  time: string;
  page?: number;
}): Promise<Connection[]> {
  const searchParams = new URLSearchParams({
    from: params.fromId,
    to: params.toId,
    date: params.date,
    time: params.time,
    limit: "16",
    page: String(params.page ?? 0),
  });

  try {
    const data = await fetchJson<ConnectionsResponse>(
      `${BASE_URL}/connections?${searchParams}`,
    );
    return data.connections ?? [];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch connections",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export function getSbbUrl(
  from: Station,
  to: Station,
  date: string,
  time: string,
): string {
  const [year, month, day] = date.split("-");
  const params = new URLSearchParams({
    von: from.name,
    nach: to.name,
    datum: `${day}.${month}.${year}`,
    zeit: `${time}:00`,
  });
  return `https://www.sbb.ch/en/buying/pages/fahrplan/fahrplan.xhtml?${params}`;
}
