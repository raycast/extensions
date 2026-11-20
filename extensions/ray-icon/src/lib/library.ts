import { environment } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyAppearance } from "./appearance";
import { ICONS } from "./icons";
import { applyPreset, DEFAULT_SETTINGS, IconSettings } from "./settings";

export type Collection = "history" | "favorites" | "templates";
export type SavedIcon = {
  version: 1;
  id: string;
  name: string;
  settings: IconSettings;
  createdAt: number;
  updatedAt: number;
  builtIn?: boolean;
};
export type Library = Record<Collection, SavedIcon[]> & { issues: string[] };
export const HISTORY_LIMIT = 100;
let lastTimestamp = 0;

const starters = [
  { id: "builtin-light", name: "Light App", settings: applyAppearance(DEFAULT_SETTINGS, "light") },
  { id: "builtin-dark", name: "Dark App", settings: applyAppearance(DEFAULT_SETTINGS, "dark") },
  { id: "builtin-gradient", name: "Ocean Gradient", settings: applyPreset(DEFAULT_SETTINGS, 7) },
  {
    id: "builtin-square",
    name: "Square Extension",
    settings: { ...applyPreset(DEFAULT_SETTINGS, 16), backgroundRadius: 0, iconSize: 320 },
  },
];
export const BUILT_IN_TEMPLATES: SavedIcon[] = starters.map((item) => ({
  ...item,
  version: 1,
  builtIn: true,
  createdAt: 0,
  updatedAt: 0,
}));

export function libraryDirectory(): string {
  const directory = join(environment.supportPath, "library");
  mkdirSync(directory, { recursive: true });
  return directory;
}

function entryPath(collection: Collection, id: string): string {
  if (!/^[a-f0-9-]+$/.test(id)) throw new Error("Invalid saved icon ID");
  return join(libraryDirectory(), `${collection}-${id}.json`);
}

export function iconIdentity(settings: IconSettings): string {
  const content = Object.fromEntries(
    Object.keys(DEFAULT_SETTINGS)
      .sort()
      .filter((key) => key !== "fileName" && key !== "selectedPresetIndex" && !(key === "icon" && settings.customSvg))
      .map((key) => [key, settings[key as keyof IconSettings]]),
  );
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function validSettings(value: unknown): value is IconSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return (
    Object.entries(DEFAULT_SETTINGS).every(([key, expected]) => {
      if (key === "icon") return settings.icon === undefined || typeof settings.icon === "string";
      if (key === "customSvg") return settings.customSvg === undefined || typeof settings.customSvg === "string";
      if (key === "selectedPresetIndex") return settings[key] === null || Number.isInteger(settings[key]);
      if (typeof expected === "number") return typeof settings[key] === "number" && Number.isFinite(settings[key]);
      return typeof settings[key] === typeof expected;
    }) &&
    ["Linear", "Radial", "Solid"].includes(String(settings.backgroundFillType)) &&
    ["backgroundStartColor", "backgroundEndColor", "backgroundStrokeColor", "iconColor"].every((key) =>
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(settings[key])),
    ) &&
    (Boolean(settings.customSvg) || (typeof settings.icon === "string" && Object.hasOwn(ICONS, settings.icon)))
  );
}

function readEntry(collection: Collection, id: string): SavedIcon | undefined {
  try {
    const item: SavedIcon = JSON.parse(readFileSync(entryPath(collection, id), "utf8"));
    if (
      item.version !== 1 ||
      item.id !== id ||
      typeof item.name !== "string" ||
      !validSettings(item.settings) ||
      !Number.isFinite(item.createdAt) ||
      !Number.isFinite(item.updatedAt)
    )
      throw new Error("Invalid saved icon data");
    return { ...item, builtIn: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function readCollection(collection: Collection, issues: string[]): SavedIcon[] {
  const entries: SavedIcon[] = [];
  for (const file of readdirSync(libraryDirectory())) {
    const match = file.match(new RegExp(`^${collection}-([a-f0-9-]+)\\.json$`));
    if (!match) continue;
    try {
      const entry = readEntry(collection, match[1]);
      if (entry) entries.push(entry);
    } catch {
      issues.push(`Could not read ${file}. The saved file has been kept.`);
    }
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

export function readLibrary(): Library {
  const issues: string[] = [];
  return {
    history: readCollection("history", issues),
    favorites: readCollection("favorites", issues),
    templates: [...readCollection("templates", issues), ...BUILT_IN_TEMPLATES],
    issues,
  };
}

/** Each record has its own atomic write so AI and command saves cannot replace unrelated records. */
function writeEntry(collection: Collection, entry: SavedIcon): SavedIcon {
  const destination = entryPath(collection, entry.id);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(entry));
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
  return entry;
}

function snapshot(settings: IconSettings, id: string, name: string): SavedIcon {
  if (!validSettings(settings)) throw new Error("Cannot save an icon with invalid settings");
  const timestamp = Math.max(Date.now(), lastTimestamp + 1);
  lastTimestamp = timestamp;
  return { version: 1, id, name, settings: { ...settings }, createdAt: timestamp, updatedAt: timestamp };
}

export function recordHistory(settings: IconSettings): SavedIcon {
  const id = iconIdentity(settings);
  const previous = readEntry("history", id);
  const entry = writeEntry("history", {
    ...snapshot(settings, id, settings.fileName),
    createdAt: previous?.createdAt ?? Date.now(),
  });
  // Favorites and templates live independently and survive history pruning/removal.
  for (const old of readCollection("history", []).slice(HISTORY_LIMIT)) removeLibraryItem("history", old.id);
  return entry;
}

export function setFavorite(settings: IconSettings, favorite: boolean): SavedIcon | undefined {
  const id = iconIdentity(settings);
  if (!favorite) {
    removeLibraryItem("favorites", id);
    return undefined;
  }
  return readEntry("favorites", id) ?? writeEntry("favorites", snapshot(settings, id, settings.fileName));
}

export function saveTemplate(settings: IconSettings, name: string): SavedIcon {
  const title = name.trim();
  if (!title) throw new Error("Give the template a name");
  return writeEntry("templates", snapshot(settings, randomUUID(), title));
}

export function renameTemplate(id: string, name: string): SavedIcon {
  const previous = getLibraryItem("templates", id);
  if (previous.builtIn) throw new Error("Save a copy to rename a built-in template");
  const title = name.trim();
  if (!title) throw new Error("Give the template a name");
  return writeEntry("templates", { ...previous, name: title, updatedAt: Date.now() });
}

export function getLibraryItem(collection: Collection, id: string): SavedIcon {
  const builtIn = collection === "templates" ? BUILT_IN_TEMPLATES.find((template) => template.id === id) : undefined;
  const item = builtIn ?? readEntry(collection, id);
  if (!item) throw new Error("Saved icon no longer exists. Refresh the library and choose another item.");
  return item;
}

export function removeLibraryItem(collection: Collection, id: string): void {
  if (id.startsWith("builtin-")) throw new Error("Built-in templates cannot be removed");
  rmSync(entryPath(collection, id), { force: true });
}

/** A style template changes the appearance, keeping the target glyph and filename. */
export function applyTemplate(template: SavedIcon, target: IconSettings): IconSettings {
  return { ...template.settings, icon: target.icon, customSvg: target.customSvg, fileName: target.fileName };
}

export function filterLibrary(items: SavedIcon[], query: string): SavedIcon[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text =
      `${item.name} ${item.settings.fileName} ${item.settings.icon ?? "custom svg"} ${item.settings.backgroundFillType}`
        .toLowerCase()
        .replace(/[-_]/g, " ");
    return terms.every((term) => text.includes(term.replace(/[-_]/g, " ")));
  });
}

export function watchLibrary(onChange: () => void, onError: (error: Error) => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(libraryDirectory(), (_event, file) => {
    if (!file?.endsWith(".json")) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, 40);
  });
  watcher.on("error", onError);
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}
