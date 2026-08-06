import { LocalStorage } from "@raycast/api";
import { AbortedError } from "./aborted";

const STORAGE_KEY = "radio_stations";

export interface Radio {
  id: number;
  url: string;
  title: string;
  description: string | null;
}

async function loadStations(signal?: AbortSignal): Promise<Radio[]> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);

  return raw ? (JSON.parse(raw) as Radio[]) : [];
}

async function saveStations(stations: Radio[], signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(stations));
}

export async function add(url: string, title: string, description: string | null, signal?: AbortSignal): Promise<void> {
  const stations = await loadStations(signal);
  const id = stations.reduce((max, station) => Math.max(max, station.id), 0) + 1;

  stations.push({ id, url, title, description: description ?? "" });
  await saveStations(stations, signal);
}

export async function edit(id: number, title: string, description: string | null, signal?: AbortSignal): Promise<void> {
  const stations = await loadStations(signal);
  const index = stations.findIndex((station) => station.id === id);

  if (index === -1) {
    throw new Error(`Radio station with id ${id} not found`);
  }

  stations[index] = { ...stations[index], title, description: description ?? "" };
  await saveStations(stations, signal);
}

export async function remove(id: number, signal?: AbortSignal): Promise<void> {
  const stations = await loadStations(signal);
  await saveStations(
    stations.filter((station) => station.id !== id),
    signal,
  );
}

export async function getAll(signal?: AbortSignal): Promise<Radio[]> {
  return await loadStations(signal);
}

export async function findByUrl(url: string, signal?: AbortSignal): Promise<Radio | null> {
  const stations = await loadStations(signal);

  return stations.find((station) => station.url === url) ?? null;
}
