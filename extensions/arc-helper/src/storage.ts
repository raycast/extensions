import { LocalStorage } from "@raycast/api";

const BLUEPRINTS_KEY = "arc-blueprints";

export interface BlueprintStatus {
  obtained: boolean;
  duplicates: number;
}

export type BlueprintStore = Record<string, BlueprintStatus>;

export async function getBlueprintStore(): Promise<BlueprintStore> {
  const data = await LocalStorage.getItem<string>(BLUEPRINTS_KEY);
  return data ? JSON.parse(data) : {};
}

export async function setBlueprintStore(store: BlueprintStore): Promise<void> {
  await LocalStorage.setItem(BLUEPRINTS_KEY, JSON.stringify(store));
}

export async function toggleBlueprintObtained(id: string): Promise<boolean> {
  const store = await getBlueprintStore();
  const current = store[id] || { obtained: false, duplicates: 0 };
  const newObtained = !current.obtained;
  store[id] = { ...current, obtained: newObtained };
  await setBlueprintStore(store);
  return newObtained;
}

export async function adjustBlueprintDuplicates(id: string, delta: number): Promise<number> {
  const store = await getBlueprintStore();
  const current = store[id] || { obtained: true, duplicates: 0 };
  const newDuplicates = Math.max(0, current.duplicates + delta);
  store[id] = { ...current, obtained: true, duplicates: newDuplicates };
  await setBlueprintStore(store);
  return newDuplicates;
}
