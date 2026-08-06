import { detach } from "./corpus";
import { compareRows, isBetterHit, scoreLine } from "./rank";
import type { Hit, Row, SessionMeta } from "./types";

/** Coalescing window: streamed hits produce at most one render per interval. */
export const FLUSH_INTERVAL_MS = 50;
/** Rendered row cap: every row re-renders on every flush, so the tail is pure cost. */
export const ROW_LIMIT = 300;
/** Results may be re-sorted freely this long after a query changes. */
export const RESORT_WINDOW_MS = 300;

/**
 * The result accumulator behind the search command: raw corpus lines in, ranked
 * rows out. Deliberately free of React and of timers, so the benchmark drives
 * the exact ingest and ranking the extension ships rather than a lookalike that
 * quietly drifts from it.
 *
 * The caller owns the plumbing: it fills `sessions`, `allow` and `words`, and
 * decides when to flush.
 */
export class ResultStore {
  /** Latest manifest snapshot, keyed by corpus key. */
  sessions = new Map<string, SessionMeta>();
  /** Best line found so far per session, for the current query. */
  hits = new Map<string, Hit>();
  /** Keys of the rows last built, in rendered order. */
  order: string[] = [];
  words: string[] = [];
  allow: (session: SessionMeta) => boolean = () => true;
  /**
   * The session whose detail pane is open, if any. A getter rather than a value
   * because `buildRows` runs on a timer: it has to see the pane open at flush
   * time, not the one that was open when the caller last re-rendered.
   */
  pinned: () => string | undefined = () => undefined;
  /**
   * Whether the current query's sweep has yet run to completion — false only
   * once one has finished or failed, and so still true for one that was
   * cancelled part-way. It answers two questions with one fact: whether hits
   * are still arriving, which is the pinned row's grace period, and whether the
   * caller may reuse what has accumulated instead of re-sweeping.
   *
   * Coverage is deliberately not the test. A sweep that gave up early is still
   * over, and holding the pin on the chance that the part it skipped would have
   * matched leaves a row that matches nothing at the top of the list for as
   * long as the pane stays open — every restart re-arms it, so nothing ever
   * clears it. Ending the grace period when the sweep ends bounds that to the
   * few seconds the user is typing, which is the whole window it was for.
   */
  sweeping = false;

  /**
   * Replaces the session snapshot with an authoritative list — one naming every
   * session that exists. Replacing rather than merging is what drops sessions
   * whose transcript is gone; merging would keep them alive as rows pointing at
   * a missing file.
   */
  seed(list: Iterable<SessionMeta>) {
    const next = new Map<string, SessionMeta>();
    for (const session of list) next.set(session.key, session);
    this.sessions = next;
  }

  /**
   * Folds a partial list into the snapshot, keeping the sessions it does not
   * mention. For payloads that are not authoritative — the intermediate batches
   * of a rebuild, which name only what has been re-indexed so far. Keys are
   * derived from the transcript path (see `corpus.ts`), so a re-indexed session
   * lands on its own existing entry rather than duplicating it.
   */
  merge(list: Iterable<SessionMeta>) {
    for (const session of list) this.sessions.set(session.key, session);
  }

  /**
   * Drops everything accumulated for the previous query or filter. `sweeping`
   * is left alone: only the caller knows whether a sweep follows this, and it
   * sets it either way before anything can build rows again.
   */
  startQuery(words: string[]) {
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
  ingestLines(lines: string[]): boolean {
    const terms = this.words;
    if (terms.length === 0) return false;
    const allow = this.allow;
    let changed = false;
    for (const line of lines) {
      const firstTab = line.indexOf("\t");
      if (firstTab === -1) continue;
      const secondTab = line.indexOf("\t", firstTab + 1);
      if (secondTab === -1) continue;
      const key = line.slice(0, firstTab);
      // Resolve and filter before scoring: a line whose session can never
      // become a row is pure waste, and the session lookup is needed either
      // way. Unknown keys are lines from a session this snapshot has not seen
      // registered yet, and are dropped the same way.
      const session = this.sessions.get(key);
      if (!session || !allow(session)) continue;
      const text = line.slice(secondTab + 1);
      const score = scoreLine(text, terms);
      if (!score) continue;
      const current = this.hits.get(key);
      if (!isBetterHit(score, current)) continue;
      this.hits.set(key, {
        // Detached: corpus lines are grouped by session, so a session's best
        // line and the ~64KB ripgrep chunk holding it are close to one-to-one.
        text: detach(text),
        // Chunks of one message share a seq, so this names the message the
        // winning line was cut from however the chunking fell.
        seq: Number(line.slice(firstTab + 1, secondTab)),
        words: score.words,
        span: score.span,
      });
      changed = true;
    }
    return changed;
  }

  /**
   * Builds the row list and records its order. With `resort` off, rows already
   * on screen keep their slots; sessions and hits that arrived since the last
   * build are ranked among themselves and appended.
   */
  buildRows(resort: boolean): Row[] {
    const allow = this.allow;
    const recent = this.words.length === 0;

    // The open pane's row, kept on screen so that refining a query leaves the
    // transcript the user is reading exactly where it is. It is deliberately
    // unmarked: a row held out of rank order is not a ranking bug to be
    // explained with a badge, and a glyph appearing in an already-churning list
    // is noise.
    //
    // It survives while hits are still arriving, since until then the absence
    // of one means nothing; with no words every session is a row anyway. Once
    // the sweep is over without a line for it, it falls out through the normal
    // path.
    const pin = this.pinned();
    let pinned: Row | undefined;
    if (pin !== undefined) {
      const session = this.sessions.get(pin);
      const hit = recent ? undefined : this.hits.get(pin);
      if (session && allow(session) && (recent || hit || this.sweeping))
        pinned = { session, hit };
    }
    /** The pinned key, and only while its row is entitled to a place. */
    const held = pinned?.session.key;

    // Placed first, which is what carries it through a query restart: that
    // clears `order`, and everything else is ranked. Not when it is already in
    // an order being kept — moving a row the user is looking at to the top is
    // exactly the churn `freeze` promises them is over, and the `kept` loop
    // below replays it where it stands. It can be absent from a kept order all
    // the same, having been capped off the tail or only just re-admitted by a
    // filter, and then this is what puts it back on screen.
    const head: Row[] = [];
    const placed = new Set<string>();
    if (pinned && (resort || !this.order.includes(pinned.session.key))) {
      head.push(pinned);
      placed.add(pinned.session.key);
    }

    // Unknown keys fall out here, which is what drops sessions a later index
    // snapshot removed.
    const kept: Row[] = [];
    if (!resort) {
      for (const key of this.order) {
        if (placed.has(key)) continue;
        const session = this.sessions.get(key);
        if (!session || !allow(session)) continue;
        const hit = recent ? undefined : this.hits.get(key);
        // The pinned row is the one row that can reach `order` without a hit,
        // and only while it is still pinned: `held` is unset the moment it
        // stops being eligible, and the row leaves with it. Every other row got
        // here by matching, and hits are only ever added within a query.
        if (!recent && !hit && key !== held) continue;
        // Content may improve in place; position may not change.
        kept.push({ session, hit });
        placed.add(key);
      }
    }

    const fresh: Row[] = [];
    if (recent) {
      // No search terms: the command doubles as a most-recent session switcher.
      for (const session of this.sessions.values()) {
        if (placed.has(session.key) || !allow(session)) continue;
        fresh.push({ session });
      }
      fresh.sort((a, b) => b.session.mtimeMs - a.session.mtimeMs);
    } else {
      for (const [key, hit] of this.hits) {
        if (placed.has(key)) continue;
        const session = this.sessions.get(key);
        // Ingest already filtered these, but a later manifest snapshot can drop
        // a session or change what it points at, so re-check rather than trust.
        if (!session || !allow(session)) continue;
        fresh.push({ session, hit });
      }
      fresh.sort(compareRows);
    }

    // Cap after ranking so the best rows survive, and with the pinned and kept
    // rows first so the cap can only ever drop the tail — never a row already
    // on screen.
    const next = head.concat(kept, fresh).slice(0, ROW_LIMIT);
    this.order = next.map((r) => r.session.key);
    return next;
  }
}

/**
 * Whether two builds would render identically. Every build allocates fresh Row
 * objects, so without this a flush carrying no news still costs a full React
 * reconcile plus re-serializing every visible List.Item across the Raycast
 * bridge — far more than the build itself.
 *
 * Identity is the test for both fields: sessions are reused across manifest
 * snapshots, and a hit object is replaced only when a better line for that
 * session is found.
 *
 * That makes this blind to one thing. The indexer updates a SessionMeta in
 * place, so a pass that only refreshed metadata — a title filled in, an mtime
 * moved on — leaves both arrays pointing at the same object and reports no news.
 * Comparing the rendered fields here would not help, for the same reason: a
 * field would be compared against itself. The caller has to notice a new session
 * snapshot and skip this check.
 */
export function rowsEqual(a: Row[], b: Row[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].session !== b[i].session || a[i].hit !== b[i].hit) return false;
  }
  return true;
}
