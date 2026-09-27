import { basename } from "path";
import type { ImportDraft } from "./folder-import";

const MAX_TITLE_LENGTH = 120;

export type CoverRef = {
  id: string;
  path: string;
  file: string;
};

export type AiTrackSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  coverId: string | null;
};

export function coverRefsFromPaths(coverPaths: string[]): CoverRef[] {
  const seen = new Set<string>();
  const covers: CoverRef[] = [];

  for (const path of coverPaths) {
    if (seen.has(path)) {
      continue;
    }

    seen.add(path);
    covers.push({
      id: `c${covers.length}`,
      path,
      file: basename(path),
    });
  }

  return covers;
}

export function applyAiSuggestions(
  drafts: ImportDraft[],
  covers: CoverRef[],
  suggestions: AiTrackSuggestion[],
): ImportDraft[] {
  const draftsById = new Map(drafts.map((draft) => [draft.id, draft]));
  const coversById = new Map(covers.map((cover) => [cover.id, cover]));
  const nextDrafts = drafts.map((draft) => ({ ...draft }));
  const nextById = new Map(nextDrafts.map((draft) => [draft.id, draft]));

  for (const suggestion of suggestions) {
    const draft = draftsById.get(suggestion.id);
    const next = nextById.get(suggestion.id);
    if (!draft || !next) {
      continue;
    }

    const title = sanitizeTitle(suggestion.title) || draft.title;
    const subtitle = sanitizeTitle(suggestion.subtitle) || title;
    next.title = title;
    next.subtitle = subtitle;

    if (shouldKeepCover(draft)) {
      continue;
    }

    if (!suggestion.coverId) {
      continue;
    }

    const cover = coversById.get(suggestion.coverId);
    if (!cover) {
      continue;
    }

    next.coverPath = cover.path;
    next.matchKind = draft.coverPath === cover.path ? draft.matchKind : "ai";
  }

  return nextDrafts;
}

export function parseAiImportResponse(
  text: string,
  validIds: Set<string>,
  validCoverIds: Set<string>,
): AiTrackSuggestion[] {
  const parsed = parseJsonObject(text);
  if (!isRecord(parsed) || !Array.isArray(parsed.tracks)) {
    throw new Error("AI did not return a track list.");
  }

  const suggestions: AiTrackSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of parsed.tracks) {
    if (!isRecord(item) || typeof item.id !== "string" || seen.has(item.id) || !validIds.has(item.id)) {
      continue;
    }

    const title = typeof item.title === "string" ? item.title : "";
    const subtitle = typeof item.subtitle === "string" ? item.subtitle : title;
    const coverId = typeof item.coverId === "string" && validCoverIds.has(item.coverId) ? item.coverId : null;

    seen.add(item.id);
    suggestions.push({
      id: item.id,
      title,
      subtitle,
      coverId,
    });
  }

  if (suggestions.length === 0) {
    throw new Error("AI did not return any usable track matches.");
  }

  return suggestions;
}

function shouldKeepCover(draft: ImportDraft): boolean {
  return draft.matchKind === "exact" || draft.matchKind === "manual";
}

function sanitizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
}

function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI did not return JSON.");
  }

  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
