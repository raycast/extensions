// React hooks the views share: the daemon's status (polled), pictures for results, a segment's text, how code and
// recordings open. Everything goes through src/lib/client.ts.

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { searchRevision } from "../lib/search-refresh";
import type { Status } from "../../engine/api";
import { DaemonError, api } from "../lib/client";
import { thumbKey, type Picture, type ThumbSpec } from "../lib/preview";
import type { ResultRow } from "../lib/results";
import { downloadRate, downloadSecondsLeft, isBusy } from "../lib/status-text";
import { momentPlayer, resolveEditor } from "./open";

export interface DaemonStatus {
  status: Status | null;
  error: Error | null;
  /** Seconds left in the model download: the daemon's measure, else one taken between polls; null when unknown. */
  secondsLeft: number | null;
  /**
   * GET /status now; the next poll is timed from it. `setupAsked`: POST /setup was just sent, so a setup that's still
   * "missing" (the download hasn't begun) is polled every second until it changes, for 15 s at most.
   */
  refresh: (options?: { setupAsked?: boolean }) => Promise<Status | null>;
}

const BUSY_MS = 1000;
/** How long a POST /setup may take to show as a download before polling slows down again. */
const SETUP_ASKED_MS = 15_000;

/** GET /status now and then: every second while something runs (a download, a pass), else every `idleMs`. */
export function useDaemonStatus(idleMs = 5000): DaemonStatus {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const busy = useRef(false);
  const sample = useRef<{ what: string; bytes: number; at: number; rate: number | null } | null>(null);
  const setupAskedUntil = useRef(0);
  const poll = useRef<{ live: boolean; timer?: NodeJS.Timeout; idleMs: number }>({ live: false, idleMs });
  poll.current.idleMs = idleMs;

  const refresh: DaemonStatus["refresh"] = useCallback(async (options?: { setupAsked?: boolean }) => {
    if (options?.setupAsked) setupAskedUntil.current = Date.now() + SETUP_ASKED_MS;
    let next: Status | null = null;
    try {
      next = await api("GET /status", undefined, { timeoutMs: 20_000 });
      const setupAsked = next.setup.state === "missing" && Date.now() < setupAskedUntil.current;
      if (!setupAsked) setupAskedUntil.current = 0;
      busy.current = isBusy(next, setupAsked);
      const setup = next.setup;
      if (setup.state === "downloading" && !setup.waiting) {
        const now = { bytes: setup.bytes, at: Date.now() };
        const before = sample.current?.what === setup.what ? sample.current : null;
        const measured = downloadRate(before, now);
        // A smoothed rate: one slow second shouldn't swing the estimate by minutes.
        const rate =
          measured === null ? (before?.rate ?? null) : before?.rate ? before.rate * 0.7 + measured * 0.3 : measured;
        sample.current = { what: setup.what, ...now, rate };
        setSecondsLeft(downloadSecondsLeft(setup, rate));
      } else {
        // Waiting for the network: no time left to tell, and the rate starts afresh when the bytes come again.
        sample.current = null;
        setSecondsLeft(null);
      }
      // Idle polls must not redraw an unchanged Raycast view.
      setStatus((before) => (JSON.stringify(before) === JSON.stringify(next) ? before : next));
      setError(null);
    } catch (caught) {
      busy.current = false; // no fast polling against an engine that doesn't answer
      const nextError = caught instanceof Error ? caught : new Error(String(caught));
      setError((before) => (before?.message === nextError.message ? before : nextError));
    }
    // The next poll, timed from this one: a refresh after an action (Pause, Download) speeds it up at once.
    const p = poll.current;
    if (p.live) {
      clearTimeout(p.timer);
      p.timer = setTimeout(() => void refresh(), busy.current ? BUSY_MS : p.idleMs);
    }
    return next;
  }, []);

  useEffect(() => {
    const p = poll.current;
    p.live = true;
    void refresh();
    return () => {
      p.live = false;
      clearTimeout(p.timer);
    };
  }, [refresh]);

  return { status, error, secondsLeft, refresh };
}

// Pictures: the daemon makes them (and keeps them on disk); this side remembers which it has for the session and asks
// for a few at a time, most wanted first, skipping any nobody wants by the time its turn comes.

type Job = { key: string; spec: ThumbSpec };

const pictures = new Map<string, Picture | null>();
const asked = new Set<string>();
const listeners = new Set<() => void>();
const wanted = new Map<symbol, Set<string>>();
const queue: Job[] = [];
const AT_ONCE = 4;
let running = 0;
/** Failed tries per picture. A timeout or a busy daemon is asked again a little later, a few times. */
const failures = new Map<string, number>();
const RETRY_MS = 30_000;
const TRIES = 3;

function isWanted(key: string): boolean {
  for (const keys of wanted.values()) if (keys.has(key)) return true;
  return false;
}

function failed(job: Job, error: unknown) {
  pictures.set(job.key, null);
  const tries = (failures.get(job.key) ?? 0) + 1;
  failures.set(job.key, tries);
  // The daemon said it can't be made (a 4xx): that stays for the session.
  const refused = error instanceof DaemonError && error.status !== undefined && error.status < 500;
  if (refused || tries >= TRIES) return;
  setTimeout(() => {
    if (pictures.get(job.key) !== null) return;
    // Not wanted now: forgotten, so it's asked again when it is.
    pictures.delete(job.key);
    if (isWanted(job.key) && !asked.has(job.key)) {
      asked.add(job.key);
      queue.push(job);
      pump();
    }
  }, RETRY_MS);
}

function pump() {
  while (running < AT_ONCE && queue.length > 0) {
    const job = queue.shift() as Job;
    if (!isWanted(job.key)) {
      asked.delete(job.key);
      continue;
    }
    running++;
    api("POST /thumb", job.spec, { timeoutMs: 30_000 })
      .then(
        (made) => {
          failures.delete(job.key);
          pictures.set(job.key, { path: made.path, width: made.width, height: made.height });
        },
        (error) => failed(job, error),
      )
      .finally(() => {
        running--;
        asked.delete(job.key);
        for (const listener of listeners) listener();
        pump();
      });
  }
}

/**
 * Pictures for `specs`: a function from a spec to its picture, undefined while it's being made, null if it can't be.
 * `first` puts these ahead of the others (the selected result's preview before the list's icons).
 */
export function usePictures(specs: ThumbSpec[], first = false): (spec: ThumbSpec) => Picture | null | undefined {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const id = useRef(Symbol("pictures")).current;
  const keys = specs.map(thumbKey);
  const signature = keys.join("\n");

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    // Pictures arrive one by one; draw them in batches.
    const listener = () => {
      timer ??= setTimeout(() => {
        timer = undefined;
        redraw();
      }, 40);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      clearTimeout(timer);
      wanted.delete(id);
    };
  }, [id]);

  useEffect(() => {
    wanted.set(id, new Set(keys));
    const jobs = specs
      .map((spec, i) => ({ key: keys[i], spec }))
      .filter(({ key }) => !pictures.has(key) && !asked.has(key));
    for (const job of jobs) asked.add(job.key);
    if (first) queue.unshift(...jobs);
    else queue.push(...jobs);
    pump();
    // `keys` and `specs` change together with `signature`.
  }, [signature, first, id]);

  return (spec) => pictures.get(thumbKey(spec));
}

const texts = new Map<string, string | null>();

/** A segment's full text (a passage, a stretch of code) for the preview; undefined while it's being read. */
export function useSegmentText(row: ResultRow | undefined, needed: boolean): string | null | undefined {
  const key = row && needed ? `${row.kind === "code" ? "code" : "main"}:${row.segmentId}` : null;
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!key || !row || texts.has(key)) return;
    let live = true;
    api("POST /segment-text", { segmentId: row.segmentId, code: row.kind === "code" }, { timeoutMs: 15_000 })
      .then(
        (reply) => texts.set(key, reply.text),
        () => texts.set(key, null),
      )
      .finally(() => {
        if (live) redraw();
      });
    return () => {
      live = false;
    };
    // `row` is read only for its segment, which `key` names.
  }, [key]);
  return key ? texts.get(key) : null;
}

/** The name of the editor code opens in; null: the file's default app; undefined while it's being looked up. */
export function useEditorName(enabled: boolean): string | null | undefined {
  const [name, setName] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled || name !== undefined) return;
    let live = true;
    resolveEditor().then((resolved) => {
      if (live) setName(resolved ? resolved.editor.name : null);
    });
    return () => {
      live = false;
    };
  }, [enabled, name]);
  return name;
}

/** Whether `row`'s recording opens at its moment (QuickTime Player or IINA can be told it). */
export function useJumpsToMoments(row: ResultRow | undefined): boolean {
  const path = row && row.moment !== null && row.moment >= 1 ? row.path : null;
  const [jumps, setJumps] = useState<{ path: string; jumps: boolean } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    momentPlayer(path).then(
      (player) => live && setJumps({ path, jumps: player !== null }),
      () => live && setJumps({ path, jumps: false }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return path !== null && jumps?.path === path && jumps.jumps;
}

/** Refresh settled searches as indexing or setup advances, without interrupting typing or requests. */
export function useSearchRefresh(
  status: Status | null,
  query: string,
  code: boolean,
  busy: boolean,
  refresh: () => void,
) {
  const revision = searchRevision(status, code);
  const latest = useRef({ query, revision, busy, refresh });
  latest.current = { query, revision, busy, refresh };
  const previous = useRef(revision);
  useEffect(() => {
    previous.current = latest.current.revision;
  }, [query, code]);
  useEffect(() => {
    const timer = setInterval(() => {
      const current = latest.current;
      if (!current.query.trim() || current.busy || previous.current === current.revision) return;
      previous.current = current.revision;
      current.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, []);
}
