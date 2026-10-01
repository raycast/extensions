import { Cache } from "@raycast/api";
import Fuse from "fuse.js";
import { DATA_URL } from "../config";
import { ConsoleCommand } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "artisan-data" });

async function download(file: string, failure: string) {
  const offline = () => {
    throw new Error(`${failure}. Check your connection.`);
  };
  const response = await fetch(`${DATA_URL}/${file}`).catch(offline);
  if (!response.ok) throw new Error(`${failure} (${response.status}).`);
  return response.text().catch(offline);
}

// The files change weekly, so a copy under a day old is fresh enough.
// Only a download that parses is saved, so a bad one falls back to the last good copy.
async function fetchDataFile<T>(file: string, failure: string, parse: (text: string) => T) {
  const raw = cache.get(file);
  const cached = raw ? (JSON.parse(raw) as { fetchedAt: number; text: string }) : undefined;
  if (cached && Date.now() - cached.fetchedAt < DAY) return parse(cached.text);
  try {
    const text = await download(file, failure);
    const data = parse(text);
    cache.set(file, JSON.stringify({ fetchedAt: Date.now(), text }));
    return data;
  } catch (error) {
    if (cached) return parse(cached.text);
    throw error;
  }
}

export async function fetchVersions() {
  return fetchDataFile("index.ts", "Couldn't load the Laravel versions", (index) => {
    // The weekly build writes one `"13.x": v13,` line per version, newest first
    const versions = [...index.matchAll(/"(\d+\.x)":/g)].map(([, version]) => version);
    if (!versions.length) throw new Error("Couldn't read the Laravel versions.");
    return versions;
  });
}

export async function fetchCommands(version: string) {
  return fetchDataFile(`${version}.json`, `Couldn't load the commands for Laravel ${version}`, (text) => {
    const commands = new Map<string, ConsoleCommand>();
    for (const command of JSON.parse(text) as ConsoleCommand[]) {
      // Names starting with _ are Artisan's internal commands, and the files list a few commands twice
      if (!command.name.startsWith("_") && !commands.has(command.name)) commands.set(command.name, command);
    }
    return [...commands.values()];
  });
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
