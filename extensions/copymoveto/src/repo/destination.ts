import { LocalStorage } from "@raycast/api";

export type Destination = {
  name: string;
  directory: string;
  enableCopy: boolean;
  enableMove: boolean;
  pinned: boolean;
};
type Destinations = Record<string, Destination>;

export async function getAll(): Promise<Destinations> {
  const destinations = await LocalStorage.allItems<Destinations>();
  return destinations;
}

export async function getOne(name: string): Promise<Destination | null> {
  const result = await LocalStorage.getItem(name);
  if (!result || typeof result !== "string") {
    return null;
  }
  const parsedResult = JSON.parse(result) as Destination;
  return parsedResult ?? null;
}

export async function saveOne(destination: Destination): Promise<void> {
  await LocalStorage.setItem(destination.name, JSON.stringify(destination));
}

export async function deleteOne(name: string): Promise<void> {
  await LocalStorage.removeItem(name);
}

export async function deleteAll(): Promise<void> {
  await LocalStorage.clear();
}

export const destinationRepo = {
  getAll,
  getOne,
  saveOne,
  deleteOne,
  deleteAll,
};
