export type Unit = "sentences" | "passages";
export type GenerationRequest = { unit: Unit; count: number };
export type Book = {
  id: string;
  title: string;
  author: string;
  language: string;
  locale: string;
  direction: "ltr" | "rtl";
  source_url: string;
  edition: string;
  scope: string;
  license: string;
  attribution: string;
  editorial_note: string;
  sentence_separator: " " | "";
};
export type BookSummary = Pick<Book, "id" | "title" | "language">;
export type SourceSection = {
  section_id: number;
  title: string;
  edition: string;
  source_url: string;
  revision_url: string;
  snapshot_sha256: string;
};
export type GeneratedUnit = SourceSection & {
  id: number;
  text: string;
  book_id: string;
  sentence_separator: " " | "";
};
export const DEFAULT_BOOK_ID = "de-finibus";

export function defaultBookId(preference: unknown, books: Pick<Book, "id">[]): string {
  return (
    books.find((book) => book.id === preference)?.id ??
    books.find((book) => book.id === DEFAULT_BOOK_ID)?.id ??
    DEFAULT_BOOK_ID
  );
}

export function orderBooks(books: BookSummary[], preferredId = DEFAULT_BOOK_ID): BookSummary[] {
  return [...books].sort((a, b) =>
    a.id === b.id
      ? 0
      : a.id === preferredId
        ? -1
        : b.id === preferredId
          ? 1
          : a.language.localeCompare(b.language, "en") ||
            a.title.localeCompare(b.title, "en") ||
            a.id.localeCompare(b.id, "en"),
  );
}

function sqlBookId(bookId: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bookId)) throw new Error("Choose a valid book.");
  return `'${bookId}'`;
}

export const booksQuery = "SELECT id, title, language FROM books";
export function bookQuery(bookId: string): string {
  return `SELECT * FROM books WHERE id = ${sqlBookId(bookId)}`;
}
export function sectionsQuery(bookId: string): string {
  return `SELECT id AS section_id, title, edition, source_url, revision_url, snapshot_sha256 FROM sections WHERE book_id = ${sqlBookId(bookId)} ORDER BY position, id`;
}

export function validateGenerationRequest(unit: unknown, count: unknown): GenerationRequest {
  if (unit !== "sentences" && unit !== "passages") throw new Error("Choose sentences or passages.");
  const maximum = maximumCount(unit);
  if (
    (typeof count !== "string" && typeof count !== "number") ||
    !/^[1-9]\d*$/.test(String(count)) ||
    !Number.isSafeInteger(Number(count)) ||
    Number(count) > maximum
  ) {
    throw new Error(`Enter a whole number from 1 to ${maximum}.`);
  }
  return { unit, count: Number(count) };
}

export function parseCountInput(unit: Unit, count: unknown, defaultCount = 3): GenerationRequest {
  const normalized = typeof count === "string" ? count.trim() : count;
  return validateGenerationRequest(unit, normalized === undefined || normalized === "" ? defaultCount : normalized);
}

function maximumCount(unit: Unit): number {
  return unit === "sentences" ? 20 : 10;
}

export type CountInput = { input: string; request: GenerationRequest; error?: string };

export function updateCountInput(previous: CountInput, input: string, defaultCount = 3): CountInput {
  try {
    return { input, request: parseCountInput(previous.request.unit, input, defaultCount) };
  } catch (error) {
    return { input, request: previous.request, error: error instanceof Error ? error.message : "Enter a valid count." };
  }
}

export function generationQuery(unit: Unit, bookId: string): string {
  const { count } = validateGenerationRequest(unit, maximumCount(unit));
  const from =
    unit === "sentences"
      ? "sentences AS u JOIN passages AS p ON p.id = u.passage_id JOIN sections AS s ON s.id = p.section_id"
      : "passages AS u JOIN sections AS s ON s.id = u.section_id";
  return `SELECT u.id, u.text, s.id AS section_id, s.title, s.edition, s.source_url, s.revision_url, s.snapshot_sha256, b.id AS book_id, b.sentence_separator
FROM ${from} JOIN books AS b ON b.id = s.book_id
WHERE b.id = ${sqlBookId(bookId)} ORDER BY RANDOM() LIMIT ${count}`;
}

export function formatGeneratedText(settings: GenerationRequest, rows: GeneratedUnit[]): string {
  const { unit, count } = validateGenerationRequest(settings.unit, settings.count);
  if (
    rows.length !== count ||
    rows.some((row) => !row.text.trim()) ||
    new Set(rows.map((row) => row.id)).size !== count ||
    new Set(rows.map((row) => row.book_id)).size !== 1 ||
    new Set(rows.map((row) => row.sentence_separator)).size !== 1
  ) {
    throw new Error("Not enough source text is available. Try again or choose a smaller count.");
  }
  return rows
    .map((row) =>
      unit === "sentences"
        ? row.text
            .trim()
            .replace(/\s*[\r\n]+\s*/gu, row.sentence_separator)
            .replace(/\s+/gu, " ")
        : row.text.trim(),
    )
    .join(unit === "sentences" ? rows[0].sentence_separator : "\n\n");
}

export function selectPreview(
  request: GenerationRequest,
  pool: GeneratedUnit[],
): { text: string; selected: GeneratedUnit[] } {
  // A generation owns the whole bounded pool, including rows not currently displayed.
  formatGeneratedText({ unit: request.unit, count: maximumCount(request.unit) }, pool);
  const selected = pool.slice(0, request.count);
  return { text: formatGeneratedText(request, selected), selected };
}

export function formatTextWithAttribution(book: Book, preview: ReturnType<typeof selectPreview>): string {
  const sections: SourceSection[] = [...new Map(preview.selected.map((row) => [row.section_id, row])).values()];
  const urls = new Set<string>();
  const sources = sections.map((section) => {
    const links = [...new Set([section.source_url, section.revision_url])].filter((url) => {
      if (urls.has(url)) return false;
      urls.add(url);
      return true;
    });
    return [`${section.title} (${section.edition})`, ...links].join("\n");
  });
  return [
    preview.text,
    "Attribution",
    `Title: ${book.title}`,
    `Author: ${book.author}`,
    `Edition: ${book.edition}`,
    `Source attribution: ${book.attribution}`,
    `License: ${book.license}`,
    "Modifications: Excerpts selected and combined by Babel Ipsum.",
    `Editorial note: ${book.editorial_note}`,
    "Selected sources:",
    ...sources,
  ].join("\n\n");
}

export function pasteActionTitle(name: unknown): string {
  const target = typeof name === "string" ? name.trim() : "";
  return target && target.toLowerCase() !== "raycast" && !/[\r\n\t]/.test(target)
    ? `Paste to ${target}`
    : "Paste to Active App";
}

export type PrimaryAction = "copy" | "paste";

export function orderedActions(primaryAction: PrimaryAction): PrimaryAction[] {
  return primaryAction === "paste" ? ["paste", "copy"] : ["copy", "paste"];
}

export type PoolState = { status: "ready"; rows: GeneratedUnit[] } | { status: "error"; message: string };

// Owned by a single command mount; no persistence or cross-command history.
export class SessionPools {
  private entries = new Map<string, Promise<PoolState>>();
  private unit: Unit;
  private query: (sql: string) => Promise<GeneratedUnit[]>;
  constructor(unit: Unit, query: (sql: string) => Promise<GeneratedUnit[]>) {
    this.unit = unit;
    this.query = query;
  }

  load(bookId: string, regenerate = false): Promise<PoolState> {
    const existing = this.entries.get(bookId);
    if (existing && !regenerate) return existing;
    const pending = this.query(generationQuery(this.unit, bookId))
      .then((rows): PoolState => {
        if (rows.some((row) => row.book_id !== bookId)) throw new Error("Source text belongs to another book.");
        selectPreview({ unit: this.unit, count: 1 }, rows);
        return { status: "ready", rows };
      })
      .catch((error: unknown): PoolState => ({
        status: "error",
        message: error instanceof Error ? error.message : "Source text could not be loaded.",
      }));
    this.entries.set(bookId, pending);
    return pending;
  }
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!>|~]/g, "\\$&").replace(/\n/g, "  \n");
}
