import keywords from "../data/keywords.json";
import functions from "../data/functions.json";
import patterns from "../data/patterns.json";
import { TYPE_PRIORITY } from "./constants";
import { SQLDialect, SQLEntry } from "../types";

const allEntries = [...keywords, ...functions, ...patterns] as SQLEntry[];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function subsequenceScore(text: string, query: string): number {
  if (!query) {
    return 0;
  }

  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] === query[qi]) {
      qi += 1;
    }
  }

  if (qi < query.length) {
    return 0;
  }

  return Math.round((query.length / text.length) * 20);
}

function scoreEntry(entry: SQLEntry, query: string): number {
  const q = normalize(query);
  if (!q) {
    return TYPE_PRIORITY[entry.type];
  }

  const title = normalize(entry.title);
  let score = TYPE_PRIORITY[entry.type];

  if (title === q) {
    score += 300;
  } else if (title.startsWith(q)) {
    score += 180;
  } else if (title.includes(q)) {
    score += 130;
  }

  const aliasExact = entry.aliases.some((alias) => normalize(alias) === q);
  const aliasPartial = entry.aliases.some((alias) => normalize(alias).includes(q));
  if (aliasExact) {
    score += 160;
  } else if (aliasPartial) {
    score += 110;
  }

  const tagExact = entry.tags.some((tag) => normalize(tag) === q);
  const tagPartial = entry.tags.some((tag) => normalize(tag).includes(q));
  if (tagExact) {
    score += 90;
  } else if (tagPartial) {
    score += 60;
  }

  const summary = normalize(entry.summary);
  if (summary.includes(q)) {
    score += 40;
  }

  const queryTokens = q.split(/\s+/).filter(Boolean);
  const searchable = `${title} ${entry.aliases.join(" ")} ${entry.tags.join(" ")} ${entry.summary}`.toLowerCase();

  const tokenMatches = queryTokens.filter((token) => searchable.includes(token)).length;
  score += tokenMatches * 25;

  if (tokenMatches === 0) {
    score += subsequenceScore(title, q);
  }

  return score;
}

export function getEntries(): SQLEntry[] {
  return allEntries;
}

export function searchEntries(query: string): SQLEntry[] {
  const hasQuery = normalize(query).length > 0;

  return [...allEntries]
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter(({ entry, score }) => {
      if (!hasQuery) {
        return true;
      }
      if (score > TYPE_PRIORITY[entry.type]) {
        return true;
      }
      const q = normalize(query);
      return normalize(entry.title).includes(q);
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.entry.title.localeCompare(b.entry.title);
    })
    .map(({ entry }) => entry);
}

export function getSyntaxForDialect(entry: SQLEntry, dialect: SQLDialect): string[] {
  const override = entry.syntax.overrides?.[dialect];
  if (override && override.length > 0) {
    return override;
  }
  return entry.syntax.common;
}

export function getExamplesForDialect(entry: SQLEntry, dialect: SQLDialect): string[] {
  const override = entry.examples[dialect];
  if (override && override.length > 0) {
    return override;
  }
  if (entry.examples.common && entry.examples.common.length > 0) {
    return entry.examples.common;
  }
  return [];
}

export function supportsDialect(entry: SQLEntry, dialect: SQLDialect): boolean {
  return entry.dialects.supported.includes(dialect);
}
