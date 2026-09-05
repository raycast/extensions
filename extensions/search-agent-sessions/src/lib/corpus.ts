import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
  truncateSync,
} from "node:fs";
import { appendFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  CLAUDE_ROOT,
  CODEX_ROOT,
  cacheDir,
  corpusPath,
  manifestPath,
  normalizeSeparators,
} from "./paths";
import type { Agent, Manifest, SessionMeta } from "./types";

/**
 * Bump to force a full re-index after changing the corpus format — or, as at 5,
 * the shape of anything stored in the manifest: cwds are now spelled with the
 * platform separator, and a cache holding the old mixed spellings would be half
 * migrated forever, since a session is only re-read when its transcript grows.
 * 6 adds `bytes`, which a manifest written by 5 cannot supply.
 */
const CORPUS_VERSION = 6;

/**
 * One read buffer for the whole module, not one per file. Line reassembly no
 * longer needs a chunk larger than the longest record (see `readLines`), so a
 * modest buffer costs nothing — and at ~1900 transcripts a per-call 8MB buffer
 * meant ~16GB of throwaway allocation to read 2.5GB.
 *
 * Sharing it is safe only because `refresh` drains one `readLines` generator at
 * a time: never two concurrently, never interleaved. Yielded buffers are views
 * into it, valid only until the generator is resumed.
 */
const READ_BUF = Buffer.allocUnsafe(1 << 18);

/**
 * Longest record kept. Transcripts contain runaway tool outputs — one real
 * record is a single 223MB JSONL line — and assembling one blocks the event
 * loop for half a second to yield a few thousand indexable characters. Records
 * past this are dropped; their bytes still count as consumed, so the offset
 * cursor stays exact and a dropped record is never re-read.
 *
 * Set well clear of legitimate records rather than as tight as the runaway
 * needs: a user message with a pasted image reaches 4MB, and the cap has to be
 * decided by the record's own length alone. Anything finer-grained would depend
 * on where the read buffer happened to land, so the same record could be
 * indexed by a cold build and dropped by an incremental one starting mid-file.
 */
const MAX_RECORD_BYTES = 1 << 24;

/** Corpus lines are snippet-sized; raw messages reach 800k chars. */
export const MAX_LINE_CHARS = 1400;
/** Carried between chunks so a multi-word match spanning a split still lands on one line. */
export const CHUNK_OVERLAP = 140;

/** How much buffered corpus text triggers a write plus an `onLines` callback. */
const FLUSH_BYTES = 1 << 18;
/**
 * Manifest checkpoint cadence, deliberately far coarser than `FLUSH_BYTES`:
 * every save restringifies the entire session list, so pinning it to the line
 * cadence cost hundreds of full rewrites of an 800KB document per cold index.
 * It only bounds how much work a kill discards, so seconds of granularity is
 * plenty.
 */
const CHECKPOINT_MS = 500;
const CHECKPOINT_BYTES = 1 << 24;

/** Re-index from scratch once this share of indexed sessions has been deleted. */
const STALE_REBUILD_RATIO = 0.2;

// Prefilters run against raw bytes so non-matching records are never decoded.
const B_USER = Buffer.from('"type":"user"');
const B_ASSISTANT = Buffer.from('"type":"assistant"');
const B_TEXT = Buffer.from('"type":"text"');
const B_STRING_CONTENT = Buffer.from('"content":"');
const B_MESSAGE = Buffer.from('"type":"message"');
const B_ROLE_USER = Buffer.from('"role":"user"');
const B_ROLE_ASSISTANT = Buffer.from('"role":"assistant"');
const B_SESSION_META = Buffer.from('"type":"session_meta"');

/** Harness scaffolding injected into message content; never worth indexing. */
const META_PREFIXES = [
  "<system-reminder>",
  "<local-command-caveat>",
  "<local-command-stdout>",
  "<command-name>",
  "<command-message>",
  "<recommended_plugins>",
  "<environment_context>",
  "<user_instructions>",
  "<permissions instructions>",
  "Caveat: The messages below were generated",
];

function isMeta(text: string): boolean {
  return META_PREFIXES.some((p) => text.startsWith(p));
}

/**
 * Preambles that are indexable content but useless as a session title: an
 * expanded slash command or an injected instruction file, not what the user
 * actually asked for. Any remaining tag-shaped block is skipped too.
 */
const TITLE_SKIP_PREFIXES = [
  "<",
  "Base directory for this skill:",
  "# AGENTS.md instructions",
  "ARGUMENTS:",
];

function isTitleWorthy(text: string): boolean {
  return (
    text.length > 0 && !TITLE_SKIP_PREFIXES.some((p) => text.startsWith(p))
  );
}

/**
 * Collapses whitespace and drops C0 control characters. NUL is not `\s` in JS,
 * and a single one written into corpus.txt makes ripgrep treat the whole file
 * as binary and abandon it — every query would then return nothing.
 */
function flatten(text: string): string {
  // no-control-regex guards against control characters reaching a regex by
  // accident; here they are the entire point — this is what removes them.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\s\x00-\x1f\x7f]+/g, " ").trim();
}

/**
 * Streams complete lines starting at `from`. Yields raw buffers; callers decode
 * only the records that survive their prefilter. `onOffset` reports the byte
 * position after the last complete line, which becomes the next refresh cursor.
 *
 * `buf` exists so a second reader can run without waiting for the indexer: the
 * shared READ_BUF is only safe while one generator is draining at a time, and
 * `readContext` is driven by the user's arrow keys, which do not wait for a
 * refresh to finish.
 */
function* readLines(
  file: string,
  from: number,
  onOffset: (offset: number) => void,
  buf: Buffer = READ_BUF,
): Generator<Buffer> {
  const fd = openSync(file, "r");
  /** Head of the line still being assembled, joined once when its newline lands. */
  const parts: Buffer[] = [];
  /** Bytes of the current line seen so far, whether buffered or dropped. */
  let pending = 0;
  /** The current line passed MAX_RECORD_BYTES; skip it but keep counting it. */
  let dropped = false;
  let consumed = from;
  try {
    let pos = from;
    for (;;) {
      const n = readSync(fd, buf, 0, buf.length, pos);
      if (n === 0) break;
      pos += n;
      const chunk = buf.subarray(0, n);
      let start = 0;
      for (;;) {
        const nl = chunk.indexOf(0x0a, start);
        if (nl === -1) break;
        const seg = chunk.subarray(start, nl);
        const total = pending + seg.length;
        // Counted even when the record is dropped, so the cursor lands past it.
        consumed += total + 1;
        start = nl + 1;
        let line: Buffer | null = null;
        if (!dropped && total <= MAX_RECORD_BYTES) {
          // Concatenating per read would be quadratic in the line's length;
          // one join per line keeps even a multi-megabyte record linear.
          if (parts.length === 0) line = seg;
          else {
            parts.push(seg);
            line = Buffer.concat(parts, total);
          }
        }
        parts.length = 0;
        pending = 0;
        dropped = false;
        if (line !== null) yield line;
      }
      if (start < n) {
        pending += n - start;
        // Stop buffering as soon as the record is already too long; the yield
        // above decides on the exact length, this only bounds the memory.
        if (dropped || pending > MAX_RECORD_BYTES) {
          parts.length = 0;
          dropped = true;
        } else {
          // Copied: the next read overwrites the shared buffer.
          parts.push(Buffer.from(chunk.subarray(start)));
        }
      }
    }
  } finally {
    closeSync(fd);
    onOffset(consumed);
  }
}

interface Sink {
  emit(key: string, seq: number, text: string): void;
  /**
   * The message behind those chunks, before flattening. Only `readContext`
   * supplies this; indexing leaves it undefined, which costs the hot path one
   * branch per message and keeps the raw text from being retained at all.
   */
  message?(seq: number, text: string, fromUser: boolean): void;
}

/** Session facts discovered while extracting, merged into the manifest entry. */
interface Extracted {
  id?: string;
  cwd?: string;
  title?: string;
  /** First indexed message, used when no user message makes a good title. */
  fallbackTitle?: string;
}

/**
 * Splits one message into corpus-sized lines. Chunks overlap by CHUNK_OVERLAP
 * and are cut at a word boundary where one is close enough. Empty when the
 * message carries no text once flattened.
 */
export function chunkMessage(raw: string): string[] {
  const text = flatten(raw);
  if (!text) return [];
  if (text.length <= MAX_LINE_CHARS) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + MAX_LINE_CHARS, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > i + MAX_LINE_CHARS / 2) end = space;
    }
    chunks.push(text.slice(i, end));
    if (end >= text.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * The tail both extractors share: drop harness scaffolding, keep the first
 * title-worthy user message, emit the chunks, and advance the message counter.
 * The first chunk stands in for the whole message when judging a title — titles
 * are truncated an order of magnitude below the chunk size, so a split cannot
 * change one.
 */
function indexMessage(
  found: Extracted,
  meta: SessionMeta,
  sink: Sink,
  text: string,
  fromUser: boolean,
) {
  if (isMeta(text)) return;
  const chunks = chunkMessage(text);
  if (chunks.length === 0) return;
  const head = chunks[0];
  if (!found.title && fromUser && isTitleWorthy(head)) found.title = head;
  if (!found.fallbackTitle) found.fallbackTitle = head;
  for (const chunk of chunks) sink.emit(meta.key, meta.seq, chunk);
  // Numbered here, past every skip above, so a message that consumed no seq is
  // never offered one. This is the single place a seq is assigned, which is why
  // reading a transcript back goes through this function rather than a second
  // decoder that would have to be kept in step with it.
  sink.message?.(meta.seq, text, fromUser);
  meta.seq++;
}

function extractClaude(
  file: string,
  meta: SessionMeta,
  sink: Sink,
  setOffset: (n: number) => void,
  buf?: Buffer,
): Extracted {
  const found: Extracted = {};
  for (const line of readLines(file, meta.offset, setOffset, buf)) {
    const isUser = line.includes(B_USER);
    if (!isUser && !line.includes(B_ASSISTANT)) continue;
    if (!line.includes(B_TEXT) && !(isUser && line.includes(B_STRING_CONTENT)))
      continue;

    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(line.toString("utf8"));
    } catch {
      continue;
    }
    if (rec.type !== "user" && rec.type !== "assistant") continue;
    if (rec.isSidechain === true) continue;
    if (!found.cwd && typeof rec.cwd === "string") found.cwd = rec.cwd;
    if (!found.id && typeof rec.sessionId === "string")
      found.id = rec.sessionId;

    const message = rec.message as { content?: unknown } | undefined;
    const content = message?.content;
    const texts: string[] = [];
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      for (const block of content) {
        if (block && typeof block === "object") {
          const b = block as { type?: string; text?: string };
          if (b.type === "text" && typeof b.text === "string")
            texts.push(b.text);
        }
      }
    }
    for (const text of texts)
      indexMessage(found, meta, sink, text, rec.type === "user");
  }
  return found;
}

function extractCodex(
  file: string,
  meta: SessionMeta,
  sink: Sink,
  setOffset: (n: number) => void,
  buf?: Buffer,
): Extracted {
  const found: Extracted = {};
  for (const line of readLines(file, meta.offset, setOffset, buf)) {
    if (!meta.cwd && !found.cwd && line.includes(B_SESSION_META)) {
      try {
        const rec = JSON.parse(line.toString("utf8"));
        if (rec.type === "session_meta" && rec.payload) {
          found.cwd = rec.payload.cwd;
          found.id = rec.payload.id;
        }
      } catch {
        // A truncated meta line just leaves the session unidentified; skip it.
      }
      continue;
    }
    if (!line.includes(B_MESSAGE)) continue;
    if (!line.includes(B_ROLE_USER) && !line.includes(B_ROLE_ASSISTANT))
      continue;

    let rec: { payload?: { type?: string; role?: string; content?: unknown } };
    try {
      rec = JSON.parse(line.toString("utf8"));
    } catch {
      continue;
    }
    const payload = rec.payload;
    if (!payload || payload.type !== "message") continue;
    if (payload.role !== "user" && payload.role !== "assistant") continue;
    if (!Array.isArray(payload.content)) continue;
    for (const block of payload.content) {
      if (!block || typeof block !== "object") continue;
      const b = block as { type?: string; text?: string };
      if (b.type !== "input_text" && b.type !== "output_text") continue;
      if (typeof b.text !== "string" || !b.text) continue;
      indexMessage(found, meta, sink, b.text, payload.role === "user");
    }
  }
  return found;
}

/** One message as the transcript holds it, before the indexer flattened it. */
export interface TranscriptMessage {
  seq: number;
  fromUser: boolean;
  text: string;
}

/**
 * Longest neighbouring message rendered into the detail pane. Raw messages
 * reach 800k characters, a pasted file or a dumped log, and the pane can show a
 * few screens at most, so the rest is bridge traffic nobody reads.
 */
const MAX_MESSAGE_CHARS = 4000;

/**
 * The message the hit came from is allowed far more, because it is the one
 * message that has to contain the matched text and a cut can hide it outright.
 * A hit records the seq of its message, not which chunk of it matched, and
 * chunks start every {@link MAX_LINE_CHARS} minus {@link CHUNK_OVERLAP}
 * characters. So a match late in a long message sits thousands of characters
 * in, and the neighbour cap put it past the ellipsis; the row's subtitle is
 * hidden while the pane is open, so the query text was then nowhere on screen.
 *
 * This covers a match roughly twenty chunks deep. Past that the pane still
 * opens on the right message with the match beyond the cut.
 */
const MAX_TARGET_CHARS = 24_000;

/**
 * Copy a string out of whatever it was sliced from. V8 represents a substring
 * as a view onto its parent, so keeping a slice keeps the whole original alive:
 * a 24k excerpt pins the 800k message it came from, and a matched corpus line
 * pins the ~64KB ripgrep chunk it was cut out of. The latter reached >100MB of
 * retention on a broad query and killed the command outright.
 *
 * utf16le round-trips code units verbatim, so an unpaired surrogate left behind
 * by corpus chunking survives. A utf8 round-trip would replace it with U+FFFD.
 */
export function detach(text: string): string {
  return Buffer.from(text, "utf16le").toString("utf16le");
}

/**
 * Truncate for display, never between the halves of a surrogate pair: slicing
 * by code unit through an emoji leaves an unpaired half that renders as U+FFFD
 * right before the ellipsis. Detached because a pane holds its messages for as
 * long as its row is mounted, and every row visited holds its own.
 */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const last = text.charCodeAt(max - 1);
  const end = last >= 0xd800 && last <= 0xdbff ? max - 1 : max;
  // Trimmed before the mark. A message keeps the whitespace it was written
  // with, unlike a flattened corpus line, so a cut inside a blank run would
  // strand the ellipsis a line or two below the text it truncates.
  return `${detach(text.slice(0, end).trimEnd())}…`;
}

/** Its own buffer, because this runs while an index refresh may be draining. */
const CONTEXT_BUF = Buffer.allocUnsafe(1 << 16);

/** Thrown to leave the extractor early; the file is closed by its `finally`. */
class Enough extends Error {}

/**
 * The messages around `seq`, read from the transcript rather than the corpus,
 * so they still have their newlines, their code fences and their markdown.
 *
 * Numbering has to agree with the corpus exactly or the pane opens on the wrong
 * message, so this drives the same extractor the indexer does, from a zeroed
 * cursor, and reads the seq off the same counter. Nothing here decides which
 * messages are indexable; that stays `indexMessage`'s to define.
 *
 * Cost is the file prefix up to the hit: everything before it must be decoded
 * to be counted, and the read stops as soon as the window is full.
 */
export function readContext(
  session: SessionMeta,
  seq: number,
  before: number,
  after: number,
): TranscriptMessage[] {
  const lead: TranscriptMessage[] = [];
  const rest: TranscriptMessage[] = [];
  let target: TranscriptMessage | undefined;

  const sink: Sink = {
    emit() {},
    message(at, text, fromUser) {
      const message = {
        seq: at,
        fromUser,
        text: clip(text, at === seq ? MAX_TARGET_CHARS : MAX_MESSAGE_CHARS),
      };
      if (at < seq) {
        lead.push(message);
        if (lead.length > before) lead.shift();
      } else if (at === seq) {
        target = message;
      } else {
        rest.push(message);
      }
      // Only once the window is complete: with `after` at zero this would
      // otherwise stop on the first message of the file, before the target.
      if (target && rest.length >= after) throw new Enough();
    },
  };

  // A private cursor: the manifest's own offset and seq describe how far the
  // index has read, and rewinding the shared object would make the next refresh
  // re-read the whole file.
  const meta = { ...session, offset: 0, seq: 0 };
  try {
    const extract = session.agent === "claude" ? extractClaude : extractCodex;
    extract(session.file, meta, sink, () => {}, CONTEXT_BUF);
  } catch {
    // Either the early exit, or a transcript deleted or rewritten under us.
    // Neither is worth surfacing. Whatever was collected still stands, and a
    // window with no target falls through to nothing below, leaving the pane on
    // the flattened chunk it already shows.
  }
  return target ? [...lead, target, ...rest] : [];
}

interface Source {
  file: string;
  agent: Agent;
  size: number;
  mtimeMs: number;
}

function collect(dir: string, agent: Agent, depth: number, acc: Source[]) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Subagent and tool-result transcripts are noise and 1.8GB of the bulk.
      if (entry.name === "subagents" || entry.name === "tool-results") continue;
      if (depth > 0) collect(p, agent, depth - 1, acc);
    } else if (entry.name.endsWith(".jsonl")) {
      try {
        const st = statSync(p);
        acc.push({ file: p, agent, size: st.size, mtimeMs: st.mtimeMs });
      } catch {
        // Raced with a session being rotated away; ignore.
      }
    }
  }
}

function discoverSources(): Source[] {
  const acc: Source[] = [];
  collect(CLAUDE_ROOT, "claude", 1, acc);
  collect(CODEX_ROOT, "codex", 6, acc);
  return acc;
}

/**
 * Corpus key for a session, derived from its transcript path so that a key
 * permanently names one session. A positional counter instead binds a key to
 * indexing order, and there are two windows where that misattributes existing
 * corpus lines: corpus.txt is appended before the manifest naming its keys is
 * saved, so a kill in between leaves a valid manifest whose counter is behind
 * the keys already on disk — and the next run re-indexes in a different order;
 * and during a rebuild the consumer still holds the old manifest while keys are
 * reissued from zero. With a content-derived key the worst a stale or lost
 * manifest can produce is duplicate or ignored lines.
 *
 * 41 bits (<= 8 base36 chars): ~1e-6 chance of one collision across today's
 * ~1900 sessions, which `uniqueKey` resolves rather than tolerates.
 */
function hashKey(file: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < file.length; i++) {
    const c = file.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13);
  }
  return ((h1 >>> 0) * 512 + (h2 >>> 23)).toString(36);
}

/** Two sessions must never share a key; probe past a collision with a suffix. */
function uniqueKey(file: string, used: Set<string>): string {
  const base = hashKey(file);
  let key = base;
  for (let i = 1; used.has(key); i++) key = `${base}z${i.toString(36)}`;
  used.add(key);
  return key;
}

function emptyManifest(): Manifest {
  return { version: CORPUS_VERSION, sessions: [], bytes: 0 };
}

/**
 * Squares corpus.txt with the length the manifest `recorded`, returning the
 * bytes still accounted for, or null when only a rebuild can repair it.
 *
 * The corpus and the manifest are two files, and a kill can land between them:
 * lines are appended continuously, the manifest saved at a far coarser cadence
 * and always after the lines it describes are on disk. A corpus longer than the
 * manifest recorded is therefore the tail of an interrupted refresh — bytes
 * whose offsets were never committed, which the sessions they came from emit
 * again on the next pass, leaving a duplicate range that every query rescans
 * until something forces a rebuild. Truncating back to the recorded length is
 * exact, because incremental indexing only appends: everything below that
 * offset is content the manifest still vouches for, and the cut lands where a
 * completed write ended.
 *
 * A shorter corpus has lost lines the manifest claims are indexed, and nothing
 * will emit them again, so the whole cache goes.
 */
export function reconcileCorpus(recorded: number): number | null {
  let size: number;
  try {
    size = statSync(corpusPath()).size;
  } catch {
    return null;
  }
  if (size < recorded) return null;
  if (size > recorded) truncateSync(corpusPath(), recorded);
  return recorded;
}

/**
 * Returns null when there is no manifest this build can use — missing, corrupt,
 * or written by an older CORPUS_VERSION. `refresh` treats that the same as a
 * manifest describing no sessions: neither can vouch for a single line already
 * in corpus.txt, so the corpus is rebuilt rather than appended to.
 */
function readManifest(): Manifest | null {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath(), "utf8")) as Manifest;
    if (
      parsed.version !== CORPUS_VERSION ||
      !Array.isArray(parsed.sessions) ||
      typeof parsed.bytes !== "number"
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadManifest(): Manifest {
  return readManifest() ?? emptyManifest();
}

/** `refresh` creates the support directory before anything can call this. */
function saveManifest(manifest: Manifest) {
  writeFileSync(manifestPath(), JSON.stringify(manifest));
}

export interface RefreshResult {
  rebuilt: boolean;
  filesIndexed: number;
  bytesRead: number;
  ms: number;
  /** The same array `onSessions` reported; see the warning there. */
  sessions: SessionMeta[];
}

export interface RefreshOptions {
  /** Corpus lines as they are appended, so a live query can search them immediately. */
  onLines?: (lines: string[]) => void;
  /**
   * The session list after each batch of files. NOT a snapshot: the same array
   * is handed out every time and grows in place. A consumer that keeps it,
   * rather than reading it immediately, has to copy it. Its identity never
   * changes, which silently defeats memoization keyed on it.
   *
   * `authoritative` says whether the list names every session that exists. It
   * is false only for the intermediate batches of a rebuild, which start from
   * an empty list and describe just the files re-indexed so far — a consumer
   * that replaced its snapshot with one of those would drop every session still
   * waiting to be re-indexed. The final call is always authoritative, so
   * deletions are still picked up once the pass finishes.
   */
  onSessions?: (sessions: SessionMeta[], authoritative: boolean) => void;
  cancelled?: () => boolean;
  /**
   * A manifest the caller has already read, exactly as `loadManifest` returns
   * it. Saves re-reading and re-parsing an 800KB document on the way to the
   * first paint; omit it and the manifest is read here.
   */
  manifest?: Manifest;
}

/**
 * Brings the corpus up to date with the transcript directories. Transcripts are
 * append-only, so this normally re-reads only the tail of the handful of files
 * that grew. Yields to the event loop every few milliseconds; the caller's UI
 * keeps rendering throughout, including during a cold full re-index.
 */
export async function refresh(
  options: RefreshOptions = {},
): Promise<RefreshResult> {
  const started = Date.now();
  let lastYield = started;
  const breathe = async () => {
    if (Date.now() - lastYield > 8) {
      await new Promise((r) => setImmediate(r));
      lastYield = Date.now();
    }
  };

  mkdirSync(cacheDir(), { recursive: true });
  const manifest = options.manifest ?? loadManifest();
  const byFile = new Map(manifest.sessions.map((s) => [s.file, s]));
  const sources = discoverSources();
  const live = new Set(sources.map((s) => s.file));

  // A manifest naming no sessions cannot vouch for any line already in the
  // corpus, and is also what `loadManifest` substitutes for a missing or
  // superseded one — so it is exactly the case where existing corpus content
  // must be discarded rather than appended to. A shrunken file means the
  // transcript was rewritten, so stored offsets are meaningless. A large share
  // of vanished sessions means the corpus is mostly orphaned lines. Any of
  // these: start over.
  let rebuilt = manifest.sessions.length === 0 || !existsSync(corpusPath());
  if (!rebuilt) {
    for (const s of sources) {
      const known = byFile.get(s.file);
      if (known && s.size < known.offset) {
        rebuilt = true;
        break;
      }
    }
  }
  if (!rebuilt && manifest.sessions.length > 0) {
    const gone = manifest.sessions.filter((s) => !live.has(s.file)).length;
    if (gone / manifest.sessions.length > STALE_REBUILD_RATIO) rebuilt = true;
  }

  // How much of corpus.txt the manifest vouches for, and so where this pass
  // appends from. Dropping whatever sits past it is what keeps the tail of an
  // interrupted refresh from being indexed a second time.
  let corpusBytes = 0;
  if (!rebuilt) {
    const usable = reconcileCorpus(manifest.bytes);
    if (usable === null) rebuilt = true;
    else corpusBytes = usable;
  }

  let state: Manifest;
  if (rebuilt) {
    // The empty manifest is saved before the corpus is cleared, so a rebuild
    // killed partway cannot leave one describing content that no longer exists:
    // a manifest naming no sessions sends the next run straight back into a
    // rebuild, whatever is in corpus.txt by then.
    state = emptyManifest();
    saveManifest(state);
    writeFileSync(corpusPath(), "");
    corpusBytes = 0;
    byFile.clear();
  } else {
    state = {
      ...manifest,
      sessions: manifest.sessions.filter((s) => live.has(s.file)),
    };
  }

  // Size or mtime differing from what was recorded means the file changed since
  // it was indexed — including an in-place rewrite, which a size-vs-offset test
  // misses whenever the new length still exceeds the stored offset. Newest
  // first: on a cold index the sessions the user wants show up soonest.
  const pending = sources
    .filter((s) => {
      const known = byFile.get(s.file);
      return !known || s.size !== known.size || s.mtimeMs !== known.mtimeMs;
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  // Buffered lines are newline-free: the terminator is added at write time so
  // `onLines` consumers see exactly the shape ripgrep hands them.
  const buffer: string[] = [];
  let buffered = 0;
  const sink: Sink = {
    emit(key, seq, text) {
      const line = `${key}\t${seq}\t${text}`;
      buffer.push(line);
      buffered += line.length + 1;
    },
  };
  const flush = () => {
    if (!buffer.length) return;
    const batch = buffer.splice(0, buffer.length);
    buffered = 0;
    const chunk = `${batch.join("\n")}\n`;
    appendFileSync(corpusPath(), chunk);
    // Bytes, not the characters `buffered` counts: this names a position in the
    // file for a later run to truncate back to.
    corpusBytes += Buffer.byteLength(chunk);
    options.onLines?.(batch);
  };

  const usedKeys = new Set(state.sessions.map((s) => s.key));
  let bytesRead = 0;
  let filesIndexed = 0;
  let savedAt = started;
  let savedBytes = corpusBytes;
  // The length saved here is what `reconcileCorpus` measures the next run's
  // corpus against, so it is taken with the offsets it belongs to.
  const checkpoint = () => {
    state.bytes = corpusBytes;
    saveManifest(state);
    savedAt = Date.now();
    savedBytes = corpusBytes;
  };
  for (const source of pending) {
    if (options.cancelled?.()) break;
    const known = byFile.get(source.file);
    const meta: SessionMeta = known ?? {
      key: uniqueKey(source.file, usedKeys),
      id: "",
      agent: source.agent,
      file: source.file,
      cwd: "",
      project: "",
      title: "",
      size: 0,
      mtimeMs: source.mtimeMs,
      offset: 0,
      seq: 0,
    };

    let nextOffset = meta.offset;
    let found: Extracted;
    try {
      const setOffset = (n: number) => {
        nextOffset = n;
      };
      found =
        source.agent === "claude"
          ? extractClaude(source.file, meta, sink, setOffset)
          : extractCodex(source.file, meta, sink, setOffset);
    } catch {
      continue; // Unreadable file; retry on the next refresh.
    }

    bytesRead += nextOffset - meta.offset;
    meta.offset = nextOffset;
    meta.size = source.size;
    meta.mtimeMs = source.mtimeMs;
    if (!meta.id)
      // Codex rollout names are `rollout-<ISO timestamp>-<uuid>`; the timestamp
      // shape has to be matched exactly, or a greedy class eats the UUID's first
      // group whenever it starts with digits.
      meta.id =
        found.id ??
        basename(source.file)
          .replace(/\.jsonl$/, "")
          .replace(/^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, "");
    if (!meta.cwd && found.cwd) {
      // The one place a cwd enters the extension, and so where its spelling is
      // settled: a Windows agent may have written either separator, and every
      // comparison and split downstream assumes the platform's. Once per
      // session, out of the per-record extractors, which see gigabytes.
      meta.cwd = normalizeSeparators(found.cwd);
      meta.project = basename(meta.cwd);
    }
    const title = found.title ?? found.fallbackTitle;
    if (!meta.title && title) meta.title = title.slice(0, 200);
    if (!known) {
      state.sessions.push(meta);
      byFile.set(meta.file, meta);
    }
    filesIndexed++;

    if (buffered > FLUSH_BYTES) {
      // Sessions first: the consumer drops streamed lines whose key it has not
      // seen yet, so an unregistered key would discard the whole batch.
      options.onSessions?.(state.sessions, !rebuilt);
      flush();
      // Checkpointing is decoupled from the flush cadence, but never runs
      // before one: a manifest describing lines still sitting in `buffer` would
      // survive a kill claiming corpus content that was never written.
      if (
        Date.now() - savedAt > CHECKPOINT_MS ||
        corpusBytes - savedBytes > CHECKPOINT_BYTES
      )
        checkpoint();
    }
    await breathe();
  }

  options.onSessions?.(state.sessions, true);
  flush();
  // A refresh that indexed nothing and dropped nothing would rewrite the
  // manifest byte for byte; on a warm open that is the single largest piece of
  // work left in the whole call.
  const unchanged =
    !rebuilt &&
    filesIndexed === 0 &&
    state.sessions.length === manifest.sessions.length;
  if (!unchanged) checkpoint();
  return {
    rebuilt,
    filesIndexed,
    bytesRead,
    ms: Date.now() - started,
    sessions: state.sessions,
  };
}
