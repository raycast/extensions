import { Note, ObsidianUtils } from "@/obsidian";
import {
  findTitleMatches,
  MAX_CONTENT_SEARCH_RESULTS,
  readSearchableNoteContent,
} from "./simple-content-search.service";

const DEFAULT_CONTEXT_LINES = 2;
const MAX_MATCHES_PER_NOTE = 20;

export interface MatchContextLine {
  line: number;
  text: string;
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

  const contentLower = content.toLocaleLowerCase();
  const queryLower = trimmedQuery.toLocaleLowerCase();
  const lines = content.split("\n");
  const matches: ContentMatch[] = [];
  let searchFrom = 0;

  while (matches.length < maxMatches) {
    const offset = contentLower.indexOf(queryLower, searchFrom);
    if (offset === -1) break;

    const start = positionAt(content, offset);
    const end = positionAt(content, offset + trimmedQuery.length);
    const firstContextLine = Math.max(1, start.line - contextLines);
    const lastContextLine = Math.min(lines.length, end.line + contextLines);
    const context: MatchContextLine[] = [];

    for (let line = firstContextLine; line <= lastContextLine; line++) {
      context.push({
        line,
        text: lines[line - 1] ?? "",
      });
    }

    matches.push({
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
      context,
    });

    searchFrom = offset + Math.max(trimmedQuery.length, 1);
  }

  return matches;
}

interface AnalyzedNote {
  note: Note;
  matches: ContentMatch[];
}

function isLiteralTitleOrPathMatch(note: Note, normalizedQuery: string): boolean {
  return (
    note.title.toLocaleLowerCase().includes(normalizedQuery) || note.path.toLocaleLowerCase().includes(normalizedQuery)
  );
}

async function analyzeNote(note: Note, query: string): Promise<ContentMatch[]> {
  try {
    const content = await readSearchableNoteContent(note);
    return content === undefined ? [] : findContentMatches(content, query);
  } catch {
    // Notes can be moved while a search is running.
    return [];
  }
}

async function analyzeTaggedNotes(notes: Note[], tagQuery: string, contentQuery: string): Promise<AnalyzedNote[]> {
  const normalizedTag = tagQuery.startsWith("#") ? tagQuery.slice(1).toLowerCase() : tagQuery.toLowerCase();
  const analyzedNotes: AnalyzedNote[] = [];

  for (const note of notes) {
    if (analyzedNotes.length >= MAX_CONTENT_SEARCH_RESULTS) break;

    try {
      const content = await readSearchableNoteContent(note);
      if (content === undefined) continue;

      const hasMatchingTag = ObsidianUtils.getAllTags(content).some((tag) => tag.toLowerCase() === normalizedTag);
      if (hasMatchingTag) {
        analyzedNotes.push({
          note,
          matches: contentQuery ? findContentMatches(content, contentQuery) : [],
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
  const { note, matches } = analyzedNote;

  if (matches.length > 0) {
    contentResults.push(
      ...matches.map((match) => ({
        id: `${note.path}:${match.line}:${match.column}`,
        note,
        match,
      }))
    );
  } else if (isLiteralTitleOrPathMatch(note, normalizedQuery)) {
    literalTitleOrPathResults.push({ id: note.path, note });
  }
}

export async function searchNotesWithMatches(notes: Note[], query: string): Promise<NoteSearchResult[]> {
  const contentQuery = queryWithoutTagFilter(query);
  const tagSearchMatch = query.match(/tag:(\S+)/i);

  if (!contentQuery) {
    if (!tagSearchMatch) {
      return notes.map((note) => ({ id: note.path, note }));
    }

    const taggedNotes = await analyzeTaggedNotes(notes, tagSearchMatch[1].trim(), "");
    return taggedNotes.map(({ note }) => ({ id: note.path, note }));
  }

  const contentResults: NoteSearchResult[] = [];
  const literalTitleOrPathResults: NoteSearchResult[] = [];
  const normalizedQuery = contentQuery.toLocaleLowerCase();

  if (tagSearchMatch) {
    const analyzedNotes = await analyzeTaggedNotes(notes, tagSearchMatch[1].trim(), contentQuery);
    const taggedNotes = analyzedNotes.map(({ note }) => note);
    const titleMatches = findTitleMatches(taggedNotes, contentQuery);
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

  const titleMatches = findTitleMatches(notes, contentQuery);
  const titleMatchPaths = new Set(titleMatches.map((note) => note.path));

  for (const note of titleMatches) {
    const matches = await analyzeNote(note, contentQuery);
    appendAnalyzedResult({ note, matches }, normalizedQuery, contentResults, literalTitleOrPathResults);
  }

  if (titleMatches.length < MAX_CONTENT_SEARCH_RESULTS) {
    let contentMatchCount = 0;

    for (const note of notes) {
      if (titleMatchPaths.has(note.path)) continue;
      if (titleMatches.length + contentMatchCount >= MAX_CONTENT_SEARCH_RESULTS) break;

      const matches = await analyzeNote(note, contentQuery);
      if (matches.length > 0) {
        contentMatchCount++;
        appendAnalyzedResult({ note, matches }, normalizedQuery, contentResults, literalTitleOrPathResults);
      }
    }
  }

  return [...contentResults, ...literalTitleOrPathResults];
}
