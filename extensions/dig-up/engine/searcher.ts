// Hybrid search (DigUp: Searcher.swift): meaning from EmbeddingGemma's vectors + words from FTS5.
//
// Meaning is the model's cosine similarity put on one scale per query (`meaning`): every vector is scored anyway, so
// the distribution comes for free, and only segments that stand out (`zGate`) count as meaning matches. That also
// gives an honest "nothing found". Words rescue what a vector can't hold exactly: codes, IDs and names.

import { CodeLookup } from "./code";
import { copyHalvesInto, HALF_TO_FLOAT, VECTOR_BYTES } from "./f16";
import {
  hasPrefix,
  inflects,
  isLetterCharacter,
  isNumberCharacter,
  Graphemes,
  graphemeCount,
  lowercased,
  normalized,
  snippet as quoteSnippet,
  trimWhitespaceAndNewlines,
} from "./searchtext";
import { parseInfo, type Row, type Store } from "./store";
import { excerpt } from "./text";
import {
  DEFAULT_OPTIONS,
  DIMENSION,
  MODALITIES,
  type FileKind,
  type Hit,
  type Modality,
  type SegmentKind,
} from "./types";

export interface SearchOptions {
  /** Only files of these kinds; null = all. Meaning is still scaled over every vector. */
  kinds?: readonly FileKind[] | null;
  limit?: number;
  /** Availability and folder selection, checked before candidate/result limits. */
  acceptPath?: (path: string) => boolean;
  zGate?: number;
  /** How much the query's words count against meaning; by default 2.0, or 1.0 in the code index. */
  wordWeight?: number;
  /** The last word is still being typed: match it as a prefix. */
  prefixLast?: boolean;
}

const SEGMENT_KINDS: ReadonlySet<string> = new Set([
  "name",
  "image",
  "ocr",
  "page",
  "page_image",
  "chunk",
  "audio",
  "frame",
  "lines",
  "cells",
]);
const KIND_NAMES: ReadonlySet<string> = new Set(["screenshot", "image", "pdf", "doc", "audio", "video", "code"]);
const MODALITY_INDEX = new Map<string, number>(MODALITIES.map((modality, index) => [modality, index]));

/** Vectors converted to float32 per block: half the memory of keeping float32 (DigUp: VectorStorage.blockRows). */
const BLOCK_ROWS = 1024;

// prettier-ignore
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "with", "and", "or", "my", "me", "that", "this",
  "these", "those", "from", "about", "where", "what", "which", "who", "when", "is", "was", "are", "were", "be",
  "it", "its", "some", "any", "find", "show", "file", "files", "photo", "photos", "picture", "image", "images",
  "screenshot", "screenshots", "video", "videos", "pdf", "document", "documents", "recording",
  // Bengali and Arabic (normalized, as `terms` sees them)
  "এবং", "ও", "এই", "সেই", "একটি", "আমার", "থেকে", "জন্য", "সাথে", "মধ্যে", "কোথায়", "কোন", "কী", "কি", "যে",
  "ছবি", "স্ক্রিনশট", "ভিডিও", "ফাইল", "পিডিএফ",
  "في", "من", "على", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي", "اين", "ما",
  "صورة", "صور", "لقطة", "شاشة", "فيديو", "ملف", "مستند",
]);

// prettier-ignore
const KIND_WORDS: ReadonlyMap<string, FileKind> = new Map<string, FileKind>([
  ["screenshot", "screenshot"], ["screenshots", "screenshot"], ["photo", "image"], ["photos", "image"],
  ["picture", "image"], ["pictures", "image"], ["image", "image"], ["images", "image"], ["pdf", "pdf"],
  ["pdfs", "pdf"], ["paper", "pdf"], ["papers", "pdf"], ["document", "doc"], ["documents", "doc"], ["note", "doc"],
  ["notes", "doc"], ["video", "video"], ["videos", "video"], ["clip", "video"], ["movie", "video"],
  ["audio", "audio"], ["song", "audio"], ["podcast", "audio"], ["voice", "audio"], ["sound", "audio"],
  ["স্ক্রিনশট", "screenshot"], ["ছবি", "image"], ["পিডিএফ", "pdf"], ["নোট", "doc"], ["ভিডিও", "video"],
  ["অডিও", "audio"], ["গান", "audio"], ["রেকর্ডিং", "audio"],
  ["لقطة", "screenshot"], ["صورة", "image"], ["صور", "image"], ["مستند", "doc"], ["ملاحظات", "doc"],
  ["فيديو", "video"], ["مقطع", "video"], ["صوت", "audio"], ["تسجيل", "audio"], ["اغنية", "audio"],
]);

/** Foundation's `CharacterSet.alphanumerics.inverted`: anything not a letter, mark or number. */
const NOT_ALPHANUMERIC = /[^\p{L}\p{M}\p{N}]+/u;

const num = (value: Row[string] | undefined): number => (value == null ? 0 : Number(value));
const str = (value: Row[string] | undefined): string | null => (value == null ? null : String(value));

interface Meaning {
  z: number;
  cosine: number;
  row: number;
}

interface WordMatch {
  file: number;
  segment: number;
  snippet: string | null;
}

export class Searcher {
  /** How much finding the query's words counts against meaning. Code's words count for less: they're everywhere in
   *  code, and a stretch that shares a few of them beat the one that does what the query says (DigUp, 2026-10-09). */
  static readonly wordWeight = 2.0;
  static readonly codeWordWeight = 1.0;

  readonly isCode: boolean;
  /** The index's `vector_source` when files were last read: meaning search needs the encoder to match it. */
  vectorSource: string | null = null;

  // The rows read so far. The vectors are kept in chunks (row-major halves, a multiple of BLOCK_ROWS rows each), so
  // rows appended later get a chunk of their own and nothing already read is copied; the per-row arrays are views of
  // `rows` length over buffers that may hold more.
  private chunks: Array<{ start: number; rows: number; halves: Uint16Array }> = [];
  private rowFile: Float64Array = new Float64Array(0);
  private rowSegment: Float64Array = new Float64Array(0);
  private rowModality: Uint8Array = new Uint8Array(0); // index into MODALITIES
  /** False for the vectors the later pass adds: scored, but they don't set the scale. */
  private rowSetsScale: Uint8Array = new Uint8Array(0);
  private rows = 0;
  private capacity = 0;
  private buffers: { file: Float64Array; segment: Float64Array; modality: Uint8Array; setsScale: Uint8Array } | null =
    null;
  /** The highest segment id read: `appendNew` reads past it. */
  private lastId = 0;
  private fileKind = new Map<number, FileKind>();
  private loaded = false;

  /** With `loadVectors: false` only keyword search is ready; vectors load on the first meaning search. */
  constructor(
    readonly store: Store,
    o: { code?: boolean; loadVectors?: boolean } = {},
  ) {
    this.isCode = o.code ?? store.code;
    if (o.loadVectors ?? true) this.reload();
    else this.reloadFiles();
  }

  /** False after `release()`: keyword search still works, and the next search with a query vector loads them. */
  get vectorsLoaded(): boolean {
    return this.loaded;
  }

  get vectorCount(): number {
    return this.rows;
  }

  /** Reads the files and all vectors again (after a sync removed some, or to start fresh). */
  reload(): void {
    this.release();
    this.reloadFiles();
    this.loaded = true;
    this.readRows();
  }

  /**
   * Reads only the vectors added since the last read: between syncs, indexing adds rows and removes none, so a pass
   * can show its new vectors without reading the hundreds of thousands it already has. Rows removed since (a sync, a
   * prune) need `reload`. Nothing happens while the vectors aren't loaded.
   */
  appendNew(): number {
    return this.loaded ? this.readRows() : 0;
  }

  /** Reads the vectors with ids past `lastId`. */
  private readRows(): number {
    const after = this.lastId;
    const count = num(this.store.get("SELECT COUNT(*) AS n FROM segments WHERE vec IS NOT NULL AND id > ?", after)?.n);
    if (count === 0) return 0;
    this.reserve(this.rows + count);
    const buffers = this.buffers!;
    const end = this.rows + count;
    let rows = this.rows;
    let chunk = this.chunks.findIndex((c) => rows < c.start + c.rows);
    const sql =
      "SELECT s.id, s.file, s.modality, s.vec, s.kind, s.loc, f.kind AS file_kind, " +
      "CAST(json_extract(f.info, '$.pages') AS INTEGER) AS pages " +
      "FROM segments s JOIN files f ON f.id = s.file WHERE s.vec IS NOT NULL AND s.id > ? ORDER BY s.id";
    for (const row of this.store.iterate(sql, after)) {
      const blob = row.vec;
      this.lastId = Math.max(this.lastId, num(row.id));
      if (!(blob instanceof Uint8Array) || blob.byteLength !== VECTOR_BYTES || rows >= end) continue;
      if (rows >= this.chunks[chunk].start + this.chunks[chunk].rows) chunk++;
      copyHalvesInto(this.chunks[chunk].halves, rows - this.chunks[chunk].start, blob);
      buffers.segment[rows] = num(row.id);
      buffers.file[rows] = num(row.file);
      buffers.modality[rows] = MODALITY_INDEX.get(str(row.modality) ?? "") ?? 0;
      // Past the first step of a long PDF (its pages) or document (its chunks).
      const kind = str(row.kind);
      const place = Math.trunc(num(row.loc));
      const later =
        str(row.file_kind) === "pdf"
          ? kind !== "chunk" && num(row.pages) > DEFAULT_OPTIONS.bigPDFPages && place > DEFAULT_OPTIONS.pdfStep
          : kind === "chunk" && place > DEFAULT_OPTIONS.docStep;
      buffers.setsScale[rows] = later ? 0 : 1;
      rows++;
    }
    const added = rows - this.rows;
    this.rows = rows;
    this.rowFile = buffers.file.subarray(0, rows);
    this.rowSegment = buffers.segment.subarray(0, rows);
    this.rowModality = buffers.modality.subarray(0, rows);
    this.rowSetsScale = buffers.setsScale.subarray(0, rows);
    return added;
  }

  /** Room for `wanted` rows: a fresh read gets what it needs; appended rows a new chunk of at least an eighth of what's
   *  there, so a pass adding a few vectors at a time doesn't allocate each time. */
  private reserve(wanted: number): void {
    if (wanted <= this.capacity) return;
    const fresh = this.rows === 0;
    const blocks = (rows: number) => Math.ceil(rows / BLOCK_ROWS) * BLOCK_ROWS;
    const more = blocks(fresh ? wanted - this.capacity : Math.max(wanted - this.capacity, this.capacity / 8));
    this.chunks.push({ start: this.capacity, rows: more, halves: new Uint16Array(more * DIMENSION) });
    const capacity = this.capacity + more;
    // The per-row arrays are small (18 bytes a row): they're copied into bigger ones.
    const old = this.buffers;
    const grown = {
      file: new Float64Array(capacity),
      segment: new Float64Array(capacity),
      modality: new Uint8Array(capacity),
      setsScale: new Uint8Array(capacity),
    };
    if (old) {
      grown.file.set(old.file.subarray(0, this.rows));
      grown.segment.set(old.segment.subarray(0, this.rows));
      grown.modality.set(old.modality.subarray(0, this.rows));
      grown.setsScale.set(old.setsScale.subarray(0, this.rows));
    }
    this.buffers = grown;
    this.capacity = capacity;
  }

  /** Frees the vectors' memory; keyword search keeps working. */
  release(): void {
    this.chunks = [];
    this.buffers = null;
    this.capacity = 0;
    this.lastId = 0;
    this.rowFile = new Float64Array(0);
    this.rowSegment = new Float64Array(0);
    this.rowModality = new Uint8Array(0);
    this.rowSetsScale = new Uint8Array(0);
    this.rows = 0;
    this.loaded = false;
  }

  /** Reads the files' kinds and the vector source again, without the vectors. */
  reloadFiles(): void {
    this.fileKind.clear();
    for (const row of this.store.iterate("SELECT id, kind FROM files")) {
      const kind = str(row.kind) ?? "";
      if (KIND_NAMES.has(kind)) this.fileKind.set(num(row.id), kind as FileKind);
    }
    this.vectorSource = this.store.vectorSource();
  }

  search(text: string, queryVector: ArrayLike<number> | null, o: SearchOptions = {}): Hit[] {
    const limit = o.limit ?? 20;
    const zGate = o.zGate ?? 2.0;
    const wordWeight = o.wordWeight ?? (this.isCode ? Searcher.codeWordWeight : Searcher.wordWeight);
    if (queryVector !== null && !this.loaded) this.reload();
    const kinds = o.kinds ? new Set(o.kinds) : null;
    const fileKind = this.fileKind;
    const allowed = (file: number) => {
      if (kinds === null) return true;
      const kind = fileKind.get(file);
      return kind !== undefined && kinds.has(kind);
    };

    const accepted = new Map<number, boolean>();
    const available = (file: number) => {
      if (!o.acceptPath) return true;
      if (!accepted.has(file)) {
        const path = str(this.store.get("SELECT path FROM files WHERE id = ?", file)?.path);
        accepted.set(file, path !== null && o.acceptPath(path));
      }
      return accepted.get(file) === true;
    };

    // Meaning: score every vector on this query's scale, keep each file's best segment (by z).
    const best = new Map<number, Meaning>();
    if (queryVector !== null && queryVector.length === DIMENSION && this.rows > 0) {
      const scores = this.score(Float32Array.from(queryVector));
      const z = Searcher.meaning(scores, this.modalities(), this.rowSetsScale);
      for (let row = 0; row < scores.length; row++) {
        const file = this.rowFile[row];
        if (!allowed(file)) continue;
        if (z[row] > (best.get(file)?.z ?? -Infinity)) best.set(file, { z: z[row], cosine: scores[row], row });
      }
    }

    // Words: FTS5 with Porter stemming over file names, folder names, OCR, page and document text. A name from code
    // ("quantize_row_q8_0_ref") is matched as one phrase, as it's written.
    const terms = Searcher.terms(text);
    const identifier = this.isCode ? CodeLookup.identifier(text) : null;
    const words: WordMatch[] = [];
    const coverage = new Map<number, number>(); // share of the query's words found anywhere in the file
    const patterns = identifier ? [CodeLookup.phrase(identifier)] : Searcher.patterns(terms, o.prefixLast ?? false);
    // A word that's in no file as typed matches as the start of longer words: "grok" finds "Grok4". One that is in
    // the index as typed stays whole ("cat" doesn't bring in "category"); so does a word of two letters.
    if (identifier === null) {
      for (let index = 0; index < terms.length; index++) {
        if (graphemeCount(terms[index]) >= 3 && !patterns[index].endsWith("*") && !this.isIndexed(patterns[index])) {
          patterns[index] += "*";
        }
      }
    }
    if (patterns.length > 0) {
      const seen = new Set<number>();
      const kindClause = kinds ? ` AND f.kind IN (${[...kinds].map(() => "?").join(",")})` : "";
      const sql =
        "SELECT s.file, s.id, snippet(fts, 1, '«', '»', '…', 12) AS snippet, fts.original FROM fts " +
        "JOIN segments s ON s.id = fts.rowid JOIN files f ON f.id = s.file WHERE fts MATCH ?" +
        kindClause +
        " ORDER BY bm25(fts, 3.0, 1.0)";
      // Limit distinct, available files. A long document must not consume a segment limit.
      for (const row of this.store.iterate(sql, patterns.join(" OR "), ...(kinds ?? []))) {
        if (words.length >= 100) break;
        const file = num(row.file);
        if (!allowed(file) || seen.has(file) || !available(file)) continue;
        seen.add(file);
        // Text that normalizing changed is quoted as it's written (with its hamza, harakat, joiners).
        const original = str(row.original);
        const fromOriginal = original === null ? null : quoteSnippet(original, terms);
        words.push({ file, segment: num(row.id), snippet: fromOriginal ?? str(row.snippet) });
      }
      if (words.length > 0) {
        const files = words.map((match) => match.file).join(",");
        const sql =
          "SELECT DISTINCT s.file FROM fts JOIN segments s ON s.id = fts.rowid " +
          `WHERE fts MATCH ? AND s.file IN (${files})`;
        const statement = this.store.db.prepare(sql);
        for (const pattern of patterns) {
          for (const row of statement.all(pattern)) {
            const file = num(row.file);
            coverage.set(file, (coverage.get(file) ?? 0) + 1 / patterns.length);
          }
        }
      }
    }

    // A file qualifies by standing out in meaning, or by containing at least half of the query's words. Score:
    // meaning z + a bonus that grows with word coverage, + 1 for the kind the query asks for. (This beat reciprocal-
    // rank fusion on both of DigUp's evals.)
    const lookup = Searcher.isLookup(terms) || identifier !== null;
    const [meaningWeight, wordsWeight] = lookup ? [0.5, wordWeight * 2] : [1, wordWeight];
    const hinted = Searcher.kindHints(text);
    const candidates = new Set<number>();
    for (const [file, meaning] of best) if (meaning.z >= zGate) candidates.add(file);
    for (const [file, share] of coverage) if (share >= 0.5) candidates.add(file);
    const scored: Array<{ file: number; score: number }> = [];
    for (const file of candidates) {
      let score = meaningWeight * Math.max(best.get(file)?.z ?? 0, 0) + wordsWeight * (coverage.get(file) ?? 0) ** 1.5;
      const kind = fileKind.get(file);
      if (kind !== undefined && hinted.has(kind)) score += 1;
      scored.push({ file, score });
    }
    scored.sort((a, b) => b.score - a.score || a.file - b.file);

    const wordRank = new Map<number, { rank: number; match: WordMatch }>();
    words.forEach((match, index) => {
      if (!wordRank.has(match.file)) wordRank.set(match.file, { rank: index + 1, match });
    });
    const hits: Hit[] = [];
    for (const { file, score } of scored) {
      if (hits.length >= limit) break;
      if (!available(file)) continue;
      const rank = hits.length;
      const semantic = best.get(file);
      const keyword = wordRank.get(file);
      // Point at the best meaning segment if it stands out; else at the segment the words matched.
      const useMeaning = semantic !== undefined && (semantic.z >= zGate || keyword === undefined);
      let segmentId = useMeaning ? this.rowSegment[semantic.row] : keyword?.match.segment;
      if (segmentId === undefined) continue;
      let focus: number | null = null;
      if (this.isCode) {
        // Where a name is defined is looked for in the first 10 results only: a name used all over a big repo is in
        // hundreds of stretches (DigUp: 560 → 100 ms a search).
        [segmentId, focus] = this.codePlace(
          file,
          segmentId,
          rank < 10 ? identifier : null,
          text,
          terms,
          keyword?.match.segment === segmentId || identifier !== null,
        );
      }
      const fileRow = this.store.get("SELECT path, kind, mtime, size, info, indexed_at FROM files WHERE id = ?", file);
      const segmentRow = this.store.get("SELECT kind, loc, loc_end, excerpt FROM segments WHERE id = ?", segmentId);
      const fileKindName = str(fileRow?.kind) ?? "";
      const segmentKind = str(segmentRow?.kind) ?? "";
      const loc = segmentRow?.loc == null ? null : num(segmentRow.loc);
      const locEnd = segmentRow?.loc_end == null ? null : num(segmentRow.loc_end);
      const storedExcerpt = str(segmentRow?.excerpt);
      // Quote the matched words only when they come from the segment pointed at, so a PDF hit on page 5 never shows
      // page 2's words. A segment with no place and no text of its own (a screenshot's image vector) can borrow them
      // from its file's OCR text, which describes the same picture.
      const sameSegment = keyword?.match.segment === segmentId ? keyword.match.snippet : null;
      let quoted = sameSegment?.includes("«") ? excerpt(sameSegment, 400) : null;
      const borrowed = keyword?.match.snippet;
      if (quoted === null && storedExcerpt === null && loc === null && borrowed?.includes("«")) {
        const matchedKind = str(this.store.get("SELECT kind FROM segments WHERE id = ?", keyword!.match.segment)?.kind);
        if (matchedKind !== "name") quoted = excerpt(borrowed, 400);
      }
      hits.push({
        path: str(fileRow?.path) ?? "",
        kind: KIND_NAMES.has(fileKindName) ? (fileKindName as FileKind) : "doc",
        score,
        z: semantic?.z ?? null,
        cosine: semantic?.cosine ?? null,
        keywordRank: keyword?.rank ?? null,
        segment: SEGMENT_KINDS.has(segmentKind) ? (segmentKind as SegmentKind) : "name",
        segmentId,
        loc,
        locEnd,
        excerpt: quoted ?? storedExcerpt,
        modified: num(fileRow?.mtime),
        previewVersion: `${this.store.previewSession}:${fileRow?.indexed_at ?? "pending"}`,
        size: num(fileRow?.size),
        info: parseInfo(str(fileRow?.info)),
        focus,
      });
    }
    return hits;
  }

  /**
   * Code: the stretch to point at, and the line in it to open at. A name looked up points at the stretch that defines
   * it, when one does (not the ones that call it). Otherwise the line is the first with the query's words, when they
   * matched in this stretch; a match by meaning alone opens at the stretch's first line.
   */
  private codePlace(
    file: number,
    segment: number,
    identifier: string[] | null,
    query: string,
    terms: string[],
    wordsHere: boolean,
  ): [number, number | null] {
    const name = trimWhitespaceAndNewlines(query).replaceAll("()", "");
    if (identifier !== null) {
      let best: { segment: number; line: number; strength: number } | null = null;
      const sql =
        "SELECT s.id, s.loc, coalesce(fts.original, fts.body) AS text FROM fts JOIN segments s ON s.id = fts.rowid " +
        "WHERE fts MATCH ? AND s.file = ? ORDER BY s.loc LIMIT 300";
      for (const row of this.store.iterate(sql, CodeLookup.phrase(identifier), file)) {
        const text = str(row.text);
        if (text === null) continue;
        const found = CodeLookup.definition(name, text, Math.trunc(num(row.loc)));
        if (found && found.strength > (best?.strength ?? 0))
          best = { segment: num(row.id), line: found.line, strength: found.strength };
        if (best?.strength === 2) break;
      }
      if (best) return [best.segment, best.line];
    }
    if (!wordsHere && identifier === null) return [segment, null];
    const text = this.segmentText(segment);
    if (text === null) return [segment, null];
    const row = this.store.get("SELECT loc FROM segments WHERE id = ?", segment);
    const first = row ? Math.trunc(num(row.loc)) : 1;
    const wanted = identifier === null ? terms : [lowercased(name)];
    return [segment, CodeLookup.firstLine(wanted, text, first)];
  }

  /** The text of a page, a passage, a stretch of code or a screenshot's OCR, as it's written (for previews). */
  segmentText(id: number): string | null {
    return str(this.store.get("SELECT coalesce(original, body) AS text FROM fts WHERE rowid = ?", id)?.text);
  }

  /** Whether keyword search finds `pattern` in any file. */
  private isIndexed(pattern: string): boolean {
    return this.store.get("SELECT 1 AS found FROM fts WHERE fts MATCH ? LIMIT 1", pattern) !== undefined;
  }

  private modalities(): Modality[] {
    return Array.from(this.rowModality, (index) => MODALITIES[index]);
  }

  /** Cosine similarity of `query` with every stored vector (all are L2-normalized): a block of rows at a time,
   *  turned into float32 first. */
  private score(query: Float32Array): Float32Array {
    const rows = this.rows;
    const scores = new Float32Array(rows);
    if (rows === 0) return scores;
    // Locals, not imports, in the loops: a bundler's CommonJS output reads an imported binding through a getter.
    const table = HALF_TO_FLOAT;
    const dimension = DIMENSION;
    const block = new Float32Array(Math.min(BLOCK_ROWS, rows) * dimension);
    for (const chunk of this.chunks) {
      const halves = chunk.halves;
      const chunkRows = Math.min(chunk.rows, rows - chunk.start);
      // A chunk holds whole blocks: a block never spans two.
      for (let start = 0; start < chunkRows; start += BLOCK_ROWS) {
        const count = Math.min(BLOCK_ROWS, chunkRows - start);
        const offset = start * dimension;
        const size = count * dimension;
        for (let i = 0; i < size; i++) block[i] = table[halves[offset + i]];
        for (let row = 0; row < count; row++) {
          const base = row * dimension;
          let sum = 0;
          for (let i = 0; i < dimension; i++) sum += block[base + i] * query[i];
          scores[chunk.start + start + row] = sum;
        }
      }
    }
    return scores;
  }

  /**
   * This query's meaning scores: each vector's cosine similarity minus the average of its modality (text, image and
   * audio vectors sit at slightly different levels for the same query), in standard deviations of all of them
   * together. Per-modality deviations inflated the narrow modalities (DigUp: 91 → 94 of 105 queries right with one
   * shared deviation). The scale comes from the rows in `setsScale` (all by default): later pages of long files are
   * scored on it but don't move it.
   */
  static meaning(
    scores: ArrayLike<number>,
    modality: readonly Modality[],
    setsScale?: ArrayLike<number | boolean>,
  ): number[] {
    const means = Searcher.modalityMeans(scores, modality, setsScale);
    const sets = (row: number) => setsScale === undefined || Boolean(setsScale[row]);
    const centered = Array.from({ length: scores.length }, (_, row) => scores[row] - (means.get(modality[row]) ?? 0));
    let count = 0;
    let sum = 0;
    for (let row = 0; row < centered.length; row++) {
      if (!sets(row)) continue;
      count++;
      sum += centered[row];
    }
    const mean = sum / Math.max(count, 1);
    let squares = 0;
    for (let row = 0; row < centered.length; row++) {
      if (sets(row)) squares += (centered[row] - mean) * (centered[row] - mean);
    }
    const deviation = Math.max(Math.sqrt(squares / Math.max(count, 1)), 0.02);
    return centered.map((value) => (value - mean) / deviation);
  }

  /** The average score of each modality for this query. Small groups (< 20 vectors) take the average of all. */
  static modalityMeans(
    scores: ArrayLike<number>,
    modality: readonly Modality[],
    setsScale?: ArrayLike<number | boolean>,
  ): Map<Modality, number> {
    const sum = new Map<Modality, number>();
    const count = new Map<Modality, number>();
    for (let row = 0; row < scores.length; row++) {
      if (setsScale !== undefined && !setsScale[row]) continue;
      sum.set(modality[row], (sum.get(modality[row]) ?? 0) + scores[row]);
      count.set(modality[row], (count.get(modality[row]) ?? 0) + 1);
    }
    let total = 0;
    let rows = 0;
    for (const value of sum.values()) total += value;
    for (const value of count.values()) rows += value;
    const all = total / Math.max(rows, 1);
    const out = new Map<Modality, number>();
    for (const each of MODALITIES) {
      const n = count.get(each) ?? 0;
      out.set(each, n >= 20 ? sum.get(each)! / n : all);
    }
    return out;
  }

  /**
   * Codes and IDs ("K7Q2LM", "TRX50") and long numbers ("4815162342") mean nothing to an embedding but everything to
   * keyword search: a query made of them weighs words double and meaning half.
   */
  static isLookup(terms: readonly string[]): boolean {
    return (
      terms.length > 0 &&
      terms.every((term) => {
        const characters = new Graphemes(term);
        let number = false;
        let letter = false;
        for (let index = 0; index < characters.count; index++) {
          const character = characters.at(index);
          number ||= isNumberCharacter(character);
          letter ||= isLetterCharacter(character);
        }
        return number && (letter || characters.count >= 4);
      })
    );
  }

  /** The content words of a query, normalized as keyword search keeps its text. Kind words ("screenshot", "video")
   *  and stopwords are dropped; words of two scalars or more count (a Bengali letter with its vowel sign is two). */
  static terms(text: string): string[] {
    const seen = new Set<string>();
    return lowercased(normalized(text))
      .split(NOT_ALPHANUMERIC)
      .filter((word) => {
        if (countScalars(word) < 2 || STOPWORDS.has(word) || seen.has(word)) return false;
        seen.add(word);
        return true;
      });
  }

  /** FTS5 patterns for the query's words: quoted, and as prefixes for the last word while it's being typed and for
   *  words of languages that attach endings. `search` makes a word that's in no file a prefix too. */
  static patterns(terms: readonly string[], prefixLast: boolean): string[] {
    return terms.map((term, index) => {
      const prefix = (prefixLast && index === terms.length - 1) || inflects(term);
      return `"${term}"` + (prefix ? "*" : "");
    });
  }

  /** The query's words as an FTS5 OR-query; null when it has none. */
  static ftsQuery(text: string, prefixLast = false): string | null {
    const words = Searcher.terms(text);
    if (words.length === 0) return null;
    return Searcher.patterns(words, prefixLast).join(" OR ");
  }

  /** Kinds the query asks for ("…in a video", "ভিডিওতে"): a soft boost, not a filter. Bengali attaches case endings,
   *  so a kind word of an inflecting script also counts at the start of a longer word. */
  static kindHints(text: string): Set<FileKind> {
    const hinted = new Set<FileKind>();
    for (const word of lowercased(normalized(text)).split(NOT_ALPHANUMERIC)) {
      let kind = KIND_WORDS.get(word);
      if (kind === undefined) {
        for (const [key, value] of KIND_WORDS) {
          if (inflects(key) && countScalars(key) >= 3 && hasPrefix(word, key)) {
            kind = value;
            break;
          }
        }
      }
      if (kind !== undefined) hinted.add(kind);
    }
    return hinted;
  }
}

function countScalars(text: string): number {
  let count = 0;
  for (const _ of text) count++;
  return count;
}
