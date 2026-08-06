import { useEffect, useMemo, useState } from "react";
import { readContext, type TranscriptMessage } from "../lib/corpus";
import { hasMatch } from "../lib/highlight";
import type { SessionMeta } from "../lib/types";

/**
 * Messages kept either side of the hit. Generous because the pane runs the full
 * height of the window and scrolls, and because the width costs almost nothing:
 * reaching the hit means decoding the whole file before it either way, so only
 * the messages after it add work.
 */
const BEFORE = 4;
const AFTER = 10;

/**
 * Held off the keystroke that caused it. Reading a transcript means decoding
 * every record up to the hit, which blocks; at one file per arrow key, holding
 * the fastest scrolling still costs nothing means the read only happens where
 * the selection actually settles.
 */
const SETTLE_MS = 150;

export interface SessionContext {
  messages: TranscriptMessage[];
  isLoading: boolean;
}

const NOTHING: TranscriptMessage[] = [];

/** A window of transcript, and what was read to get it. */
interface Loaded {
  /** Corpus key of the session it was read from. */
  key: string;
  seq: number;
  messages: TranscriptMessage[];
}

/**
 * The transcript around a session's best matching line, for the detail pane.
 *
 * Only ever enabled for the selected row: this is a synchronous file read, and
 * running it for every rendered row would be several hundred of them per flush.
 *
 * @param seq The message the current hit came from, or undefined when there is
 * no hit — an unsearched list, or a session the restarted sweep has not reached
 * again yet.
 * @param words The query, which decides whether the loaded window is still
 * worth showing. Note that this is a different question from the one the list
 * asks: the list keeps a row while the *session* matches, and the pane keeps
 * its window while the *text it already holds* matches.
 */
export function useSessionContext(
  session: SessionMeta,
  seq: number | undefined,
  words: string[],
  enabled: boolean,
): SessionContext {
  const [loaded, setLoaded] = useState<Loaded>();
  // What is held stops being shown the moment it stops describing the row: a
  // selection moves before its read lands, and for those 150ms the previous
  // messages must not render against the new row.
  const held = loaded?.key === session.key ? loaded : undefined;

  // A space is a safe separator: `parseQuery` splits on whitespace. Keyed on the
  // joined words rather than the array so that a keystroke which leaves the
  // query words alone — a trailing space, a `dir:` token — does not re-scan.
  const wordsKey = words.join(" ");
  // Answered "yes" without looking for a row that does not have the selection.
  // Nothing downstream can observe the difference — such a row simply keeps
  // what it read, which is what still lists its files under "Open File in
  // Orca" once the pane is hidden — and the row is re-tested in the same render
  // that hands it the selection back. Without this, every row the pane has ever
  // been opened on rescans tens of kilobytes on every keystroke, forever.
  const covers = useMemo(() => {
    if (!enabled || !held || !wordsKey) return true;
    const terms = wordsKey.split(" ");
    return held.messages.some((message) => hasMatch(message.text, terms));
  }, [enabled, held, wordsKey]);

  // Refining a query restarts the sweep, and the new best line for this session
  // is usually a different one. Following it would move the transcript out from
  // under someone who is reading it, so the window that is open wins for as
  // long as the query is still findable in it. Only when it is not — the words
  // moved off this stretch of the file entirely — does the new hit take over.
  // With no hit at all, the head of the transcript, which is where a session
  // opened from the unsearched list should start.
  const want = held && (seq === undefined || covers) ? held.seq : (seq ?? 0);

  const ready = held?.seq === want;

  useEffect(() => {
    // Already read, and transcripts are append-only below the hit, so the
    // answer cannot have changed. Without this, arrowing off a row and back
    // decodes its whole prefix again, tens of milliseconds of blocking work for
    // a result still sitting in state. It also absorbs the identity churn of a
    // rebuilt manifest, which allocates fresh SessionMeta objects for keys that
    // mean what they meant before.
    if (ready || !enabled) return;
    let live = true;
    const timer = setTimeout(() => {
      const messages = readContext(session, want, BEFORE, AFTER);
      if (live) setLoaded({ key: session.key, seq: want, messages });
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, ready, session, want]);

  // The window being replaced stays on screen until its replacement lands,
  // with the spinner marking it provisional. Dropping it first would blank the
  // pane down to a one-line fallback for the settle interval, on a keystroke
  // whose whole purpose is that the pane stays readable. Only `held`'s own
  // session check keeps one row's transcript off another row, and that is
  // independent of which window of this session is loaded.
  return {
    messages: held?.messages ?? NOTHING,
    isLoading: enabled && !ready,
  };
}
