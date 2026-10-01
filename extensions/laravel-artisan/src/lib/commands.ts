import { Cache } from "@raycast/api";
import Fuse from "fuse.js";
import { DATA_URL } from "../config";
import { ConsoleCommand } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "artisan-data" });

// The files change weekly, so a copy under a day old is fresh enough
async function fetchDataFile(file: string, failure: string) {
  const raw = cache.get(file);
  const cached = raw ? (JSON.parse(raw) as { fetchedAt: number; text: string }) : undefined;
  if (cached && Date.now() - cached.fetchedAt < DAY) return cached.text;
  const response = await fetch(`${DATA_URL}/${file}`).catch(() => undefined);
  if (!response?.ok) {
    if (cached) return cached.text;
    throw new Error(response ? `${failure} (${response.status}).` : `${failure}. Check your connection.`);
  }
  const text = await response.text();
  cache.set(file, JSON.stringify({ fetchedAt: Date.now(), text }));
  return text;
}

export async function fetchVersions() {
  const index = await fetchDataFile("index.ts", "Couldn't load the Laravel versions");
  // The weekly build writes one `"13.x": v13,` line per version, newest first
  return [...index.matchAll(/"(\d+\.x)":/g)].map(([, version]) => version);
}

export async function fetchCommands(version: string) {
  const text = await fetchDataFile(`${version}.json`, `Couldn't load the commands for Laravel ${version}`);
  const commands = JSON.parse(text) as ConsoleCommand[];
  // Names starting with _ are Artisan's internal commands
  return commands.filter((command) => !command.name.startsWith("_"));
}

export function argumentDefault(value: ConsoleCommand["arguments"][number]["default"]) {
  return [value ?? []].flat().join(", ") || undefined;
}

// Option and argument text is long, so only a strict match there counts
export function searchCommands(commands: ConsoleCommand[], term: string) {
  if (!term.trim()) return commands;
  const loose = new Fuse(commands, {
    keys: ["name", "aliases", "description", "synopsis"],
    ignoreLocation: true,
    includeScore: true,
    threshold: 0.5,
  });
  const strict = new Fuse(commands, {
    keys: ["arguments.description", "options.description"],
    ignoreLocation: true,
    includeScore: true,
    threshold: 0.1,
  });
  const ranked = [...loose.search(term), ...strict.search(term)].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const seen = new Set<string>();
  const results: ConsoleCommand[] = [];
  for (const { item } of ranked) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    results.push(item);
  }
  return results;
}
