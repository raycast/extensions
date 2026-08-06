"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHUNK_OVERLAP = exports.MAX_LINE_CHARS = void 0;
exports.chunkMessage = chunkMessage;
exports.loadManifest = loadManifest;
exports.refresh = refresh;
const node_fs_1 = require("node:fs");
const node_fs_2 = require("node:fs");
const node_path_1 = require("node:path");
const paths_1 = require("./paths");
/** Bump to force a full re-index after changing the corpus format. */
const CORPUS_VERSION = 4;
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
exports.MAX_LINE_CHARS = 1400;
/** Carried between chunks so a multi-word match spanning a split still lands on one line. */
exports.CHUNK_OVERLAP = 140;
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
function isMeta(text) {
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
function isTitleWorthy(text) {
    return (text.length > 0 && !TITLE_SKIP_PREFIXES.some((p) => text.startsWith(p)));
}
/**
 * Collapses whitespace and drops C0 control characters. NUL is not `\s` in JS,
 * and a single one written into corpus.txt makes ripgrep treat the whole file
 * as binary and abandon it — every query would then return nothing.
 */
function flatten(text) {
    // no-control-regex guards against control characters reaching a regex by
    // accident; here they are the entire point — this is what removes them.
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\s\x00-\x1f\x7f]+/g, " ").trim();
}
/**
 * Streams complete lines starting at `from`. Yields raw buffers; callers decode
 * only the records that survive their prefilter. `onOffset` reports the byte
 * position after the last complete line, which becomes the next refresh cursor.
 */
function* readLines(file, from, onOffset) {
    const fd = (0, node_fs_1.openSync)(file, "r");
    /** Head of the line still being assembled, joined once when its newline lands. */
    const parts = [];
    /** Bytes of the current line seen so far, whether buffered or dropped. */
    let pending = 0;
    /** The current line passed MAX_RECORD_BYTES; skip it but keep counting it. */
    let dropped = false;
    let consumed = from;
    try {
        let pos = from;
        for (;;) {
            const n = (0, node_fs_1.readSync)(fd, READ_BUF, 0, READ_BUF.length, pos);
            if (n === 0)
                break;
            pos += n;
            const chunk = READ_BUF.subarray(0, n);
            let start = 0;
            for (;;) {
                const nl = chunk.indexOf(0x0a, start);
                if (nl === -1)
                    break;
                const seg = chunk.subarray(start, nl);
                const total = pending + seg.length;
                // Counted even when the record is dropped, so the cursor lands past it.
                consumed += total + 1;
                start = nl + 1;
                let line = null;
                if (!dropped && total <= MAX_RECORD_BYTES) {
                    // Concatenating per read would be quadratic in the line's length;
                    // one join per line keeps even a multi-megabyte record linear.
                    if (parts.length === 0)
                        line = seg;
                    else {
                        parts.push(seg);
                        line = Buffer.concat(parts, total);
                    }
                }
                parts.length = 0;
                pending = 0;
                dropped = false;
                if (line !== null)
                    yield line;
            }
            if (start < n) {
                pending += n - start;
                // Stop buffering as soon as the record is already too long; the yield
                // above decides on the exact length, this only bounds the memory.
                if (dropped || pending > MAX_RECORD_BYTES) {
                    parts.length = 0;
                    dropped = true;
                }
                else {
                    // Copied: the next read overwrites the shared buffer.
                    parts.push(Buffer.from(chunk.subarray(start)));
                }
            }
        }
    }
    finally {
        (0, node_fs_1.closeSync)(fd);
        onOffset(consumed);
    }
}
/**
 * Splits one message into corpus-sized lines. Chunks overlap by CHUNK_OVERLAP
 * and are cut at a word boundary where one is close enough. Empty when the
 * message carries no text once flattened.
 */
function chunkMessage(raw) {
    const text = flatten(raw);
    if (!text)
        return [];
    if (text.length <= exports.MAX_LINE_CHARS)
        return [text];
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        let end = Math.min(i + exports.MAX_LINE_CHARS, text.length);
        if (end < text.length) {
            const space = text.lastIndexOf(" ", end);
            if (space > i + exports.MAX_LINE_CHARS / 2)
                end = space;
        }
        chunks.push(text.slice(i, end));
        if (end >= text.length)
            break;
        i = end - exports.CHUNK_OVERLAP;
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
function indexMessage(found, meta, sink, text, fromUser) {
    if (isMeta(text))
        return;
    const chunks = chunkMessage(text);
    if (chunks.length === 0)
        return;
    const head = chunks[0];
    if (!found.title && fromUser && isTitleWorthy(head))
        found.title = head;
    if (!found.fallbackTitle)
        found.fallbackTitle = head;
    for (const chunk of chunks)
        sink.emit(meta.key, meta.seq, chunk);
    meta.seq++;
}
function extractClaude(file, meta, sink, setOffset) {
    const found = {};
    for (const line of readLines(file, meta.offset, setOffset)) {
        const isUser = line.includes(B_USER);
        if (!isUser && !line.includes(B_ASSISTANT))
            continue;
        if (!line.includes(B_TEXT) && !(isUser && line.includes(B_STRING_CONTENT)))
            continue;
        let rec;
        try {
            rec = JSON.parse(line.toString("utf8"));
        }
        catch {
            continue;
        }
        if (rec.type !== "user" && rec.type !== "assistant")
            continue;
        if (rec.isSidechain === true)
            continue;
        if (!found.cwd && typeof rec.cwd === "string")
            found.cwd = rec.cwd;
        if (!found.id && typeof rec.sessionId === "string")
            found.id = rec.sessionId;
        const message = rec.message;
        const content = message?.content;
        const texts = [];
        if (typeof content === "string")
            texts.push(content);
        else if (Array.isArray(content)) {
            for (const block of content) {
                if (block && typeof block === "object") {
                    const b = block;
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
function extractCodex(file, meta, sink, setOffset) {
    const found = {};
    for (const line of readLines(file, meta.offset, setOffset)) {
        if (!meta.cwd && !found.cwd && line.includes(B_SESSION_META)) {
            try {
                const rec = JSON.parse(line.toString("utf8"));
                if (rec.type === "session_meta" && rec.payload) {
                    found.cwd = rec.payload.cwd;
                    found.id = rec.payload.id;
                }
            }
            catch {
                // A truncated meta line just leaves the session unidentified; skip it.
            }
            continue;
        }
        if (!line.includes(B_MESSAGE))
            continue;
        if (!line.includes(B_ROLE_USER) && !line.includes(B_ROLE_ASSISTANT))
            continue;
        let rec;
        try {
            rec = JSON.parse(line.toString("utf8"));
        }
        catch {
            continue;
        }
        const payload = rec.payload;
        if (!payload || payload.type !== "message")
            continue;
        if (payload.role !== "user" && payload.role !== "assistant")
            continue;
        if (!Array.isArray(payload.content))
            continue;
        for (const block of payload.content) {
            if (!block || typeof block !== "object")
                continue;
            const b = block;
            if (b.type !== "input_text" && b.type !== "output_text")
                continue;
            if (typeof b.text !== "string" || !b.text)
                continue;
            indexMessage(found, meta, sink, b.text, payload.role === "user");
        }
    }
    return found;
}
function collect(dir, agent, depth, acc) {
    let entries;
    try {
        entries = (0, node_fs_1.readdirSync)(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const p = (0, node_path_1.join)(dir, entry.name);
        if (entry.isDirectory()) {
            // Subagent and tool-result transcripts are noise and 1.8GB of the bulk.
            if (entry.name === "subagents" || entry.name === "tool-results")
                continue;
            if (depth > 0)
                collect(p, agent, depth - 1, acc);
        }
        else if (entry.name.endsWith(".jsonl")) {
            try {
                const st = (0, node_fs_1.statSync)(p);
                acc.push({ file: p, agent, size: st.size, mtimeMs: st.mtimeMs });
            }
            catch {
                // Raced with a session being rotated away; ignore.
            }
        }
    }
}
function discoverSources() {
    const acc = [];
    collect(paths_1.CLAUDE_ROOT, "claude", 1, acc);
    collect(paths_1.CODEX_ROOT, "codex", 6, acc);
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
function hashKey(file) {
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
function uniqueKey(file, used) {
    const base = hashKey(file);
    let key = base;
    for (let i = 1; used.has(key); i++)
        key = `${base}z${i.toString(36)}`;
    used.add(key);
    return key;
}
function emptyManifest() {
    return { version: CORPUS_VERSION, sessions: [] };
}
/**
 * Returns null when there is no manifest this build can use — missing, corrupt,
 * or written by an older CORPUS_VERSION. `refresh` treats that the same as a
 * manifest describing no sessions: neither can vouch for a single line already
 * in corpus.txt, so the corpus is rebuilt rather than appended to.
 */
function readManifest() {
    try {
        const parsed = JSON.parse((0, node_fs_1.readFileSync)(paths_1.MANIFEST_PATH, "utf8"));
        if (parsed.version !== CORPUS_VERSION || !Array.isArray(parsed.sessions))
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
function loadManifest() {
    return readManifest() ?? emptyManifest();
}
/** `refresh` creates CACHE_DIR before anything can call this. */
function saveManifest(manifest) {
    (0, node_fs_2.writeFileSync)(paths_1.MANIFEST_PATH, JSON.stringify(manifest));
}
/**
 * Brings the corpus up to date with the transcript directories. Transcripts are
 * append-only, so this normally re-reads only the tail of the handful of files
 * that grew. Yields to the event loop every few milliseconds; the caller's UI
 * keeps rendering throughout, including during a cold full re-index.
 */
async function refresh(options = {}) {
    const started = Date.now();
    let lastYield = started;
    const breathe = async () => {
        if (Date.now() - lastYield > 8) {
            await new Promise((r) => setImmediate(r));
            lastYield = Date.now();
        }
    };
    (0, node_fs_1.mkdirSync)(paths_1.CACHE_DIR, { recursive: true });
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
    let rebuilt = manifest.sessions.length === 0 || !(0, node_fs_1.existsSync)(paths_1.CORPUS_PATH);
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
        if (gone / manifest.sessions.length > STALE_REBUILD_RATIO)
            rebuilt = true;
    }
    let state;
    if (rebuilt) {
        (0, node_fs_2.writeFileSync)(paths_1.CORPUS_PATH, "");
        state = emptyManifest();
        byFile.clear();
    }
    else {
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
    const buffer = [];
    let buffered = 0;
    const sink = {
        emit(key, seq, text) {
            const line = `${key}\t${seq}\t${text}`;
            buffer.push(line);
            buffered += line.length + 1;
        },
    };
    let appended = 0;
    const flush = () => {
        if (!buffer.length)
            return;
        const batch = buffer.splice(0, buffer.length);
        appended += buffered;
        buffered = 0;
        (0, node_fs_2.appendFileSync)(paths_1.CORPUS_PATH, `${batch.join("\n")}\n`);
        options.onLines?.(batch);
    };
    const usedKeys = new Set(state.sessions.map((s) => s.key));
    let bytesRead = 0;
    let filesIndexed = 0;
    let savedAt = started;
    let savedBytes = 0;
    for (const source of pending) {
        if (options.cancelled?.())
            break;
        const known = byFile.get(source.file);
        const meta = known ?? {
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
        let found;
        try {
            const setOffset = (n) => {
                nextOffset = n;
            };
            found =
                source.agent === "claude"
                    ? extractClaude(source.file, meta, sink, setOffset)
                    : extractCodex(source.file, meta, sink, setOffset);
        }
        catch {
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
                    (0, node_path_1.basename)(source.file)
                        .replace(/\.jsonl$/, "")
                        .replace(/^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, "");
        if (!meta.cwd && found.cwd) {
            meta.cwd = found.cwd;
            meta.project = (0, node_path_1.basename)(found.cwd);
        }
        const title = found.title ?? found.fallbackTitle;
        if (!meta.title && title)
            meta.title = title.slice(0, 200);
        if (!known) {
            state.sessions.push(meta);
            byFile.set(meta.file, meta);
        }
        filesIndexed++;
        if (buffered > FLUSH_BYTES) {
            // Sessions first: the consumer drops streamed lines whose key it has not
            // seen yet, so an unregistered key would discard the whole batch.
            options.onSessions?.(state.sessions);
            flush();
            // Checkpointing is decoupled from the flush cadence, but never runs
            // before one: a manifest describing lines still sitting in `buffer` would
            // survive a kill claiming corpus content that was never written.
            const now = Date.now();
            if (now - savedAt > CHECKPOINT_MS ||
                appended - savedBytes > CHECKPOINT_BYTES) {
                saveManifest(state);
                savedAt = now;
                savedBytes = appended;
            }
        }
        await breathe();
    }
    options.onSessions?.(state.sessions);
    flush();
    // A refresh that indexed nothing and dropped nothing would rewrite the
    // manifest byte for byte; on a warm open that is the single largest piece of
    // work left in the whole call.
    const unchanged = !rebuilt &&
        filesIndexed === 0 &&
        state.sessions.length === manifest.sessions.length;
    if (!unchanged)
        saveManifest(state);
    return {
        rebuilt,
        filesIndexed,
        bytesRead,
        ms: Date.now() - started,
        sessions: state.sessions,
    };
}
