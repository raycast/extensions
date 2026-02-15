import { LocalStorage } from "@raycast/api";
import { fetchActiveZones } from "./zones";
import { RaycastEvent } from "../types";

export const HOME_ZONE_STORAGE_KEY = "townspot-home-zone-id";

export type ActiveTown = {
  id: number;
  name: string;
  slug: string;
};

export type ResolvedTown = {
  town: ActiveTown;
  source: "home" | "query";
};

type BuildAiPromptInput = {
  query: string;
  townName: string;
  apiAnswer: string;
  events: RaycastEvent[];
};

const sanitizeLabel = (value: string): string =>
  String(value || "").replace(/\s+/g, " ").trim();

const eventLine = (event: RaycastEvent, index: number): string => {
  const title = sanitizeLabel(event.title) || "Untitled event";
  const start = sanitizeLabel(event.startLabel) || sanitizeLabel(event.startTime) || "Time unknown";
  const venue = sanitizeLabel(event.venueName) || "Venue unknown";
  const tags = Array.isArray(event.tags) && event.tags.length ? event.tags.join(", ") : "No tags";
  const url = sanitizeLabel(event.url) || "No URL";
  return `${index + 1}. ${title} | ${start} | ${venue} | ${tags} | ${url}`;
};

export const buildTownspotAiPrompt = (input: BuildAiPromptInput): string => {
  const query = sanitizeLabel(input.query);
  const townName = sanitizeLabel(input.townName) || "your town";
  const apiAnswer = sanitizeLabel(input.apiAnswer);
  const eventsBlock = input.events.map(eventLine).join("\n");

  return [
    "You are TownSpot AI.",
    "Answer using only the verified events provided below.",
    "Do not invent events, venues, times, or links.",
    "If the user asks for something not present in the data, say you couldn't find a verified match and suggest broadening filters.",
    "Keep the response concise and practical.",
    "",
    `User query: ${query}`,
    `Town: ${townName}`,
    `TownSpot API summary: ${apiAnswer || "No summary provided."}`,
    "",
    "Verified events:",
    eventsBlock || "No verified events were returned.",
  ].join("\n");
};

export const buildVerifiedEventsMarkdown = (events: RaycastEvent[]): string => {
  if (!events.length) return "_No verified listings found._";

  return events
    .map((event) => {
      const title = sanitizeLabel(event.title) || "Untitled event";
      const start = sanitizeLabel(event.startLabel) || sanitizeLabel(event.startTime) || "Time unknown";
      const venue = sanitizeLabel(event.venueName) || "Venue unknown";
      const tags = Array.isArray(event.tags) && event.tags.length ? event.tags.join(", ") : "";
      const link = sanitizeLabel(event.url);
      const firstLine = link ? `- [${title}](${link})` : `- ${title}`;
      const secondLine = `  - ${start} · ${venue}${tags ? ` · ${tags}` : ""}`;
      return `${firstLine}\n${secondLine}`;
    })
    .join("\n");
};

const normalizeForMatch = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsPhrase = (query: string, phrase: string): boolean => {
  if (!query || !phrase) return false;
  const pattern = new RegExp(`(^|\\s)${escapeRegex(phrase)}(\\s|$)`, "i");
  return pattern.test(query);
};

const inferTownFromQuery = (query: string, towns: ActiveTown[]): ActiveTown | null => {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return null;

  let bestTown: ActiveTown | null = null;
  let bestScore = 0;

  for (const town of towns) {
    const normalizedName = normalizeForMatch(town.name);
    const normalizedSlug = normalizeForMatch(town.slug);
    if (!normalizedName && !normalizedSlug) continue;

    let score = 0;
    if (containsPhrase(normalizedQuery, normalizedName)) score += 100 + normalizedName.length;
    if (containsPhrase(normalizedQuery, normalizedSlug)) score += 90 + normalizedSlug.length;

    if (score > bestScore) {
      bestScore = score;
      bestTown = town;
    }
  }

  return bestScore > 0 ? bestTown : null;
};

export const resolveTownForPrompt = async (
  apiBaseUrl: string,
  prompt: string,
): Promise<ResolvedTown> => {
  const zones = await fetchActiveZones(apiBaseUrl);
  if (!zones.length) {
    throw new Error("No active towns are available right now.");
  }

  const towns: ActiveTown[] = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
  }));

  const storedId = await LocalStorage.getItem<string>(HOME_ZONE_STORAGE_KEY);
  const parsedId = Number(storedId || "");
  const homeTown = Number.isFinite(parsedId)
    ? towns.find((town) => town.id === parsedId)
    : undefined;

  const inferredTown = inferTownFromQuery(prompt, towns);
  if (inferredTown) {
    return {
      town: inferredTown,
      source: "query",
    };
  }

  const zone = homeTown || towns[0];
  return {
    town: zone,
    source: "home",
  };
};
