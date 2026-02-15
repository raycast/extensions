import { LocalStorage } from "@raycast/api";
import { fetchActiveZones } from "./zones";
import { RaycastEvent } from "../types";

export const HOME_ZONE_STORAGE_KEY = "townspot-home-zone-id";

export type ActiveTown = {
  id: number;
  name: string;
  slug: string;
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

export const resolveActiveTown = async (apiBaseUrl: string): Promise<ActiveTown> => {
  const zones = await fetchActiveZones(apiBaseUrl);
  if (!zones.length) {
    throw new Error("No active towns are available right now.");
  }

  const storedId = await LocalStorage.getItem<string>(HOME_ZONE_STORAGE_KEY);
  const parsedId = Number(storedId || "");
  const selectedZone = Number.isFinite(parsedId)
    ? zones.find((zone) => zone.id === parsedId)
    : undefined;

  const zone = selectedZone || zones[0];
  return {
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
  };
};
