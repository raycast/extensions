import { LocalStorage } from "@raycast/api";

import {
  DESTINATION_SCHEMA_VERSION,
  type Destination,
  type DestinationCollection,
  isDestination,
} from "../domain/destination";

const STORAGE_KEY = "destination-collection";

export async function getDestinations(): Promise<Destination[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored === undefined) {
    return [];
  }

  let value: unknown;
  try {
    value = JSON.parse(stored) as unknown;
  } catch {
    throw new Error("Saved destinations are corrupted and could not be parsed.");
  }

  if (!isDestinationCollection(value)) {
    throw new Error("Saved destinations use an unsupported or invalid schema.");
  }

  return value.destinations;
}

export async function saveDestinations(destinations: readonly Destination[]): Promise<void> {
  const collection: DestinationCollection = {
    version: DESTINATION_SCHEMA_VERSION,
    destinations: [...destinations],
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

export async function upsertDestination(destination: Destination): Promise<Destination[]> {
  const destinations = await getDestinations();
  const existingIndex = destinations.findIndex((current) => current.id === destination.id);
  const next =
    existingIndex === -1
      ? [...destinations, destination]
      : destinations.map((current) => (current.id === destination.id ? destination : current));
  await saveDestinations(next);
  return next;
}

export async function removeDestination(id: string): Promise<Destination[]> {
  const destinations = await getDestinations();
  const next = destinations.filter((destination) => destination.id !== id);
  await saveDestinations(next);
  return next;
}

export async function setDestinationPinned(id: string, pinned: boolean): Promise<Destination[]> {
  const destinations = await getDestinations();
  const next = destinations.map((destination) => (destination.id === id ? { ...destination, pinned } : destination));
  await saveDestinations(next);
  return next;
}

function isDestinationCollection(value: unknown): value is DestinationCollection {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const collection = value as Partial<DestinationCollection>;
  return (
    collection.version === DESTINATION_SCHEMA_VERSION &&
    Array.isArray(collection.destinations) &&
    collection.destinations.every(isDestination)
  );
}
