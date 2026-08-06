"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultStore = exports.RESORT_WINDOW_MS = exports.ROW_LIMIT = exports.FLUSH_INTERVAL_MS = void 0;
exports.rowsEqual = rowsEqual;
const rank_1 = require("./rank");
/** Coalescing window: streamed hits produce at most one render per interval. */
exports.FLUSH_INTERVAL_MS = 50;
/** Rendered row cap: every row re-renders on every flush, so the tail is pure cost. */
exports.ROW_LIMIT = 300;
/** Results may be re-sorted freely this long after a query changes. */
exports.RESORT_WINDOW_MS = 300;
/**
 * The result accumulator behind the search command: raw corpus lines in, ranked
 * rows out. Deliberately free of React and of timers, so the benchmark drives
 * the exact ingest and ranking the extension ships rather than a lookalike that
 * quietly drifts from it.
 *
 * The caller owns the plumbing: it fills `sessions`, `allow` and `words`, and
 * decides when to flush.
 */
class ResultStore {
    constructor() {
        /** Latest manifest snapshot, keyed by corpus key. */
        this.sessions = new Map();
        /** Best line found so far per session, for the current query. */
        this.hits = new Map();
        /** Keys of the rows last built, in rendered order. */
        this.order = [];
        this.words = [];
        this.allow = () => true;
    }
    /** Drops everything accumulated for the previous query or filter. */
    startQuery(words) {
        this.words = words;
        this.hits.clear();
        this.order = [];
    }
    /**
     * Scores a batch of raw corpus lines (`key \t seq \t text`), keeping the best
     * line per session. Returns whether anything changed, i.e. whether a flush is
     * worth scheduling.
     *
     * Tab parsing is inline and the fields are sliced only once they are needed:
     * this runs over hundreds of thousands of lines per keystroke, so a per-line
     * helper object would dominate the cost it is helping with.
     */
    ingestLines(lines) {
        const terms = this.words;
        if (terms.length === 0)
            return false;
        const allow = this.allow;
        let changed = false;
        for (const line of lines) {
            const firstTab = line.indexOf("\t");
            if (firstTab === -1)
                continue;
            const secondTab = line.indexOf("\t", firstTab + 1);
            if (secondTab === -1)
                continue;
            const key = line.slice(0, firstTab);
            // Resolve and filter before scoring: a line whose session can never
            // become a row is pure waste, and the session lookup is needed either
            // way. Unknown keys are lines from a session this snapshot has not seen
            // registered yet, and are dropped the same way.
            const session = this.sessions.get(key);
            if (!session || !allow(session))
                continue;
            const text = line.slice(secondTab + 1);
            const score = (0, rank_1.scoreLine)(text, terms);
            if (!score)
                continue;
            const current = this.hits.get(key);
            if (!(0, rank_1.isBetterHit)(score, current))
                continue;
            this.hits.set(key, { text, words: score.words, span: score.span });
            changed = true;
        }
        return changed;
    }
    /**
     * Builds the row list and records its order. With `resort` off, rows already
     * on screen keep their slots; sessions and hits that arrived since the last
     * build are ranked among themselves and appended.
     */
    buildRows(resort) {
        const allow = this.allow;
        const recent = this.words.length === 0;
        // Unknown keys fall out here, which is what drops sessions a later index
        // snapshot removed.
        const kept = [];
        const placed = new Set();
        if (!resort) {
            for (const key of this.order) {
                const session = this.sessions.get(key);
                if (!session || !allow(session))
                    continue;
                // Content may improve in place; position may not change.
                kept.push({ session, hit: recent ? undefined : this.hits.get(key) });
                placed.add(key);
            }
        }
        const fresh = [];
        if (recent) {
            // No search terms: the command doubles as a most-recent session switcher.
            for (const session of this.sessions.values()) {
                if (placed.has(session.key) || !allow(session))
                    continue;
                fresh.push({ session });
            }
            fresh.sort((a, b) => b.session.mtimeMs - a.session.mtimeMs);
        }
        else {
            for (const [key, hit] of this.hits) {
                if (placed.has(key))
                    continue;
                const session = this.sessions.get(key);
                // Ingest already filtered these, but a later manifest snapshot can drop
                // a session or change what it points at, so re-check rather than trust.
                if (!session || !allow(session))
                    continue;
                fresh.push({ session, hit });
            }
            fresh.sort(rank_1.compareRows);
        }
        // Cap after ranking so the best rows survive, and with the kept rows first
        // so the cap can only ever drop the tail — never a row already on screen.
        const next = kept.concat(fresh).slice(0, exports.ROW_LIMIT);
        this.order = next.map((r) => r.session.key);
        return next;
    }
}
exports.ResultStore = ResultStore;
/**
 * Whether two builds would render identically. Every build allocates fresh Row
 * objects, so without this a flush carrying no news still costs a full React
 * reconcile plus re-serializing every visible List.Item across the Raycast
 * bridge — far more than the build itself.
 *
 * Identity is the right test for both fields: sessions are reused across
 * manifest snapshots, and a hit object is replaced only when a better line for
 * that session is found.
 */
function rowsEqual(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].session !== b[i].session || a[i].hit !== b[i].hit)
            return false;
    }
    return true;
}
