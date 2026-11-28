import { environment } from "@raycast/api";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Which command a model is chosen for: "default" = All Commands. */
export type ModelSlot = "default" | "translate" | "reply" | "rewrite";

type Store = Record<string, Partial<Record<string, string>>>;

// Chosen in AI Buddy (Connection row, ⌘M on a buddy) (Raycast Settings can't list models), kept per provider.
const file = () => join(environment.supportPath, "models.json");

function read(): Store {
  try {
    const data: unknown = JSON.parse(readFileSync(file(), "utf8"));
    return typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Store) : {};
  } catch {
    return {};
  }
}

/** The model chosen for this command and provider, if any. */
export function chosenModel(providerId: string, slot: ModelSlot): string | undefined {
  const value = read()[providerId]?.[slot];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Saves the choice; undefined clears it (back to the default). */
export function setModel(providerId: string, slot: ModelSlot, model: string | undefined) {
  const store = read();
  const forProvider = { ...(store[providerId] ?? {}) };
  if (model?.trim()) forProvider[slot] = model.trim();
  else delete forProvider[slot];
  store[providerId] = forProvider;
  mkdirSync(environment.supportPath, { recursive: true });
  writeFileSync(file(), JSON.stringify(store, null, 2));
}
