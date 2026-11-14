import { Note, ObsidianUtils } from "@/obsidian";
import {
  findTitleOrPathMatches,
  MAX_CONTENT_SEARCH_RESULTS,
  readNoteContentForSearch,
  SearchableNoteContentResult,
} from "./simple-content-search.service";

const DEFAULT_CONTEXT_LINES = 2;
const MAX_MATCHES_PER_NOTE = 20;
export const MAX_CONTEXT_LINE_LENGTH = 500;

export interface MatchContextLine {
  line: number;
  text: string;
  startColumn: number;
}

export interface ContentMatch {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  context: MatchContextLine[];
}

export interface NoteSearchResult {
  id: string;
  note: Note;
  match?: ContentMatch;
}

function positionAt(content: string, offset: number): { line: number; column: number } {
  const before = content.slice(0, offset);
  const lastNewline = before.lastIndexOf("\n");
  return {
    line: before.split("\n").length,
    column: offset - lastNewline,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function queryWithoutTagFilter(query: string): string {
  return query.replace(/tag:\S+/gi, "").trim();
}

export function findContentMatches(
  content: string,
  query: string,
  contextLines = DEFAULT_CONTEXT_LINES,
  maxMatches = MAX_MATCHES_PER_NOTE
): ContentMatch[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || maxMatches <= 0) return [];

  const matcher = new RegExp(escapeRegExp(trimmedQuery), "giu");
  const lines = content.split("\n");
  const matches: ContentMatch[] = [];

  while (matches.length < maxMatches) {
    const result = matcher.exec(content);
    if (!result) break;

    const offset = result.index;
    const start = positionAt(content, offset);
    const end = positionAt(content, offset + result[0].length);
    const firstContextLine = Math.max(1, start.line - contextLines);
    const lastContextLine = Math.min(lines.length, end.line + contextLines);
    const context: MatchContextLine[] = [];

    for (let line = firstContextLine; line <= lastContextLine; line++) {
      const lineText = lines[line - 1] ?? "";
      let contextStart = 0;
      if (lineText.length > MAX_CONTEXT_LINE_LENGTH && line >= start.line && line <= end.line) {
        const matchStart = line === start.line ? start.column - 1 : 0;
        contextStart = Math.min(
          Math.max(0, matchStart - Math.floor(MAX_CONTEXT_LINE_LENGTH / 2)),
          lineText.length - MAX_CONTEXT_LINE_LENGTH
        );
      }

      context.push({
        line,
        text: lineText.slice(contextStart, contextStart + MAX_CONTEXT_LINE_LENGTH),
        startColumn: contextStart + 1,
      });
    }

    matches.push({
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
      context,
    });
  }

  return matches;
}

interface AnalyzedNote {
  note: Note;
  matches: ContentMatch[];
  contentStatus: SearchableNoteContentResult["status"];
}

type ShouldCancelSearch = () => boolean;

function isLiteralTitleOrPathMatch(note: Note, normalizedQuery: string): boolean {
  return (
    note.title.toLocaleLowerCase().includes(normalizedQuery) || note.path.toLocaleLowerCase().includes(normalizedQuery)
  );
}

async function analyzeNote(note: Note, query: string): Promise<Omit<AnalyzedNote, "note">> {
  try {
    const result = await readNoteContentForSearch(note);
    return result.status === "available"
      ? { matches: findContentMatches(result.content, query), contentStatus: result.status }
      : { matches: [], contentStatus: result.status };
  } catch {
    // Notes can be moved while a search is running.
    return { matches: [], contentStatus: "unavailable" };
  }
}

async function analyzeTaggedNotes(
  notes: Note[],
  tagQuery: string,
  contentQuery: string,
  shouldCancel: ShouldCancelSearch
): Promise<AnalyzedNote[]> {
  const normalizedTag = tagQuery.startsWith("#") ? tagQuery.slice(1).toLowerCase() : tagQuery.toLowerCase();
  const analyzedNotes: AnalyzedNote[] = [];

  for (const note of notes) {
    if (shouldCancel() || analyzedNotes.length >= MAX_CONTENT_SEARCH_RESULTS) break;

    try {
      const result = await readNoteContentForSearch(note);
      if (result.status !== "available") continue;

      const hasMatchingTag = ObsidianUtils.getAllTags(result.content).some(
        (tag) => tag.toLowerCase() === normalizedTag
      );
      if (hasMatchingTag) {
        analyzedNotes.push({
          note,
          matches: contentQuery ? findContentMatches(result.content, contentQuery) : [],
          contentStatus: result.status,
        });
      }
    } catch {
      // Notes can be moved while a search is running.
    }
  }

  return analyzedNotes;
}

function appendAnalyzedResult(
  analyzedNote: AnalyzedNote,
  normalizedQuery: string,
  contentResults: NoteSearchResult[],
  literalTitleOrPathResults: NoteSearchResult[]
): void {
  const { note, matches, contentStatus } = analyzedNote;

  if (matches.length > 0) {
    contentResults.push(
      ...matches.map((match) => ({
        id: `${note.path}:${match.line}:${match.column}`,
        note,
        match,
      }))
    );
  } else if (contentStatus === "oversized" || isLiteralTitleOrPathMatch(note, normalizedQuery)) {
    literalTitleOrPathResults.push({ id: note.path, note });
  }
}

export async function searchNotesWithMatches(
  notes: Note[],
  query: string,
  shouldCancel: ShouldCancelSearch = () => false
): Promise<NoteSearchResult[]> {
  const contentQuery = queryWithoutTagFilter(query);
  const tagSearchMatch = query.match(/tag:(\S+)/i);

  if (!contentQuery) {
    if (!tagSearchMatch) {
      return notes.map((note) => ({ id: note.path, note }));
    }

    const taggedNotes = await analyzeTaggedNotes(notes, tagSearchMatch[1].trim(), "", shouldCancel);
    return taggedNotes.map(({ note }) => ({ id: note.path, note }));
  }

  const contentResults: NoteSearchResult[] = [];
  const literalTitleOrPathResults: NoteSearchResult[] = [];
  const normalizedQuery = contentQuery.toLocaleLowerCase();

  if (tagSearchMatch) {
    const analyzedNotes = await analyzeTaggedNotes(notes, tagSearchMatch[1].trim(), contentQuery, shouldCancel);
    const taggedNotes = analyzedNotes.map(({ note }) => note);
    const titleMatches = findTitleOrPathMatches(taggedNotes, contentQuery);
    const titleMatchPaths = new Set(titleMatches.map((note) => note.path));
    const analyzedByPath = new Map(analyzedNotes.map((analyzedNote) => [analyzedNote.note.path, analyzedNote]));

    for (const note of titleMatches) {
      const analyzedNote = analyzedByPath.get(note.path);
      if (analyzedNote) {
        appendAnalyzedResult(analyzedNote, normalizedQuery, contentResults, literalTitleOrPathResults);
      }
    }

    for (const analyzedNote of analyzedNotes) {
      if (!titleMatchPaths.has(analyzedNote.note.path) && analyzedNote.matches.length > 0) {
        appendAnalyzedResult(analyzedNote, normalizedQuery, contentResults, literalTitleOrPathResults);
      }
    }

    return [...contentResults, ...literalTitleOrPathResults];
  }

  const titleMatches = findTitleOrPathMatches(notes, contentQuery);
  const titleMatchPaths = new Set(titleMatches.map((note) => note.path));

  for (const note of titleMatches) {
    if (shouldCancel()) break;
    const analysis = await analyzeNote(note, contentQuery);
    appendAnalyzedResult({ note, ...analysis }, normalizedQuery, contentResults, literalTitleOrPathResults);
  }

  if (titleMatches.length < MAX_CONTENT_SEARCH_RESULTS) {
    let contentMatchCount = 0;

    for (const note of notes) {
      if (shouldCancel()) break;
      if (titleMatchPaths.has(note.path)) continue;
      if (titleMatches.length + contentMatchCount >= MAX_CONTENT_SEARCH_RESULTS) break;

      const analysis = await analyzeNote(note, contentQuery);
      if (analysis.matches.length > 0) {
        contentMatchCount++;
        appendAnalyzedResult({ note, ...analysis }, normalizedQuery, contentResults, literalTitleOrPathResults);
      }
    }
  }

  return [...contentResults, ...literalTitleOrPathResults];
}
