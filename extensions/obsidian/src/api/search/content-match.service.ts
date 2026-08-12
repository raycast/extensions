import fs from "fs";
import { Note } from "@/obsidian";
import { searchNotesWithContent } from "./simple-content-search.service";

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

export async function searchNotesWithMatches(notes: Note[], query: string): Promise<NoteSearchResult[]> {
  const matchingNotes = await searchNotesWithContent(notes, query);
  const contentQuery = queryWithoutTagFilter(query);

  if (!contentQuery) {
    return matchingNotes.map((note) => ({ id: note.path, note }));
  }

  const contentResults: NoteSearchResult[] = [];
  const literalTitleOrPathResults: NoteSearchResult[] = [];
  const normalizedQuery = contentQuery.toLocaleLowerCase();

  for (const note of matchingNotes) {
    try {
      const content = await fs.promises.readFile(note.path, "utf-8");
      const matches = findContentMatches(content, contentQuery);

      if (matches.length > 0) {
        contentResults.push(
          ...matches.map((match) => ({
            id: `${note.path}:${match.line}:${match.column}`,
            note,
            match,
          }))
        );
      } else if (
        note.title.toLocaleLowerCase().includes(normalizedQuery) ||
        note.path.toLocaleLowerCase().includes(normalizedQuery)
      ) {
        // Keep literal title/path matches, but discard fuzzy-only candidates.
        literalTitleOrPathResults.push({ id: note.path, note });
      }
    } catch {
      // The original search tolerates notes being moved while a search is running.
    }
  }

  return [...contentResults, ...literalTitleOrPathResults];
}
