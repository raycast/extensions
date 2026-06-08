import type { RandomFactEvent } from "../types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function getRecord(value: unknown, key: string): JsonRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const nested = value[key];

  return isRecord(nested) ? nested : undefined;
}

function getArray(value: unknown, key: string): readonly unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  const nested = value[key];

  return Array.isArray(nested) ? nested : [];
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function getOptionalString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const nested = value[key];

  return typeof nested === "string" && nested.trim().length > 0 ? nested.trim() : undefined;
}

function buildEvent(event: RandomFactEvent): readonly RandomFactEvent[] {
  return [event];
}

export function parseUselessFacts(payload: unknown): readonly RandomFactEvent[] {
  const fact = getOptionalString(payload, "text") ?? getOptionalString(payload, "fact");

  if (!fact) {
    return [];
  }

  return buildEvent({
    description: "Random fact",
    itemUrl: getOptionalString(payload, "permalink"),
    title: fact,
  });
}

export function parseQuotable(payload: unknown): readonly RandomFactEvent[] {
  const content = getOptionalString(payload, "content");

  if (!content) {
    return [];
  }

  const author = getOptionalString(payload, "author");
  const quoteId = getOptionalString(payload, "_id") ?? getOptionalString(payload, "id");

  return buildEvent({
    description: author ? `- ${author}` : undefined,
    itemUrl: quoteId ? `https://api.quotable.io/quotes/${quoteId}` : undefined,
    title: content,
  });
}

export function parseZenQuotes(payload: unknown): readonly RandomFactEvent[] {
  const first = asArray(payload)[0];
  const quote = getOptionalString(first, "q");

  if (!quote) {
    return [];
  }

  const author = getOptionalString(first, "a");

  return buildEvent({
    description: author ? `- ${author}` : undefined,
    title: quote,
  });
}

function extractWikiPageUrl(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const contentUrls = getRecord(value, "content_urls");
  const desktop = getRecord(contentUrls, "desktop");

  return getOptionalString(desktop, "page") ?? getOptionalString(value, "canonical");
}

export function parseWikifeeds(payload: unknown): readonly RandomFactEvent[] {
  return getArray(payload, "events").reduce<RandomFactEvent[]>((events, event) => {
    if (!isRecord(event)) {
      return events;
    }

    const title = getOptionalString(event, "text");

    if (!title) {
      return events;
    }

    const pages = getArray(event, "pages");
    const firstPage = pages[0];
    const year = getOptionalString(event, "year");

    events.push({
      ...(year ? { description: year, year } : {}),
      itemUrl: extractWikiPageUrl(firstPage),
      title,
    });

    return events;
  }, []);
}

export function parseHistoryMuffinLabs(payload: unknown): readonly RandomFactEvent[] {
  const data = getRecord(payload, "data");

  if (!data) {
    return [];
  }

  return getArray(data, "Events").reduce<RandomFactEvent[]>((events, event) => {
    if (!isRecord(event)) {
      return events;
    }

    const title = getOptionalString(event, "text");

    if (!title) {
      return events;
    }

    const links = getArray(event, "links");
    const firstLink = links[0];
    const year = getOptionalString(event, "year");

    events.push({
      ...(year ? { description: year, year } : {}),
      itemUrl: getOptionalString(firstLink, "link"),
      title,
    });

    return events;
  }, []);
}
