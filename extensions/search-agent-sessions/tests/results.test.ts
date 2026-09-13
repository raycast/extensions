import assert from "node:assert/strict";
import { test } from "node:test";
import { ResultStore } from "../src/lib/results";
import type { SessionMeta } from "../src/lib/types";
import { session } from "./fixtures";

/** Matches the stdout chunk size ripgrep's output arrives in. */
const CHUNK_CHARS = 1 << 16;

/**
 * Feeds lines exactly the way `search.ts`'s `pump` does — accumulate a chunk,
 * slice off the trailing partial line, split — so the strings handed to ingest
 * have the same V8 representation as the ones the extension really sees.
 */
function pumpInto(store: ResultStore, lines: string[]) {
  let pending: string[] = [];
  let size = 0;
  const drain = () => {
    if (!pending.length) return;
    const combined = `${pending.join("\n")}\n`;
    const cut = combined.lastIndexOf("\n");
    store.ingestLines(combined.slice(0, cut).split("\n"));
    pending = [];
    size = 0;
  };
  for (const line of lines) {
    pending.push(line);
    size += line.length + 1;
    if (size >= CHUNK_CHARS) drain();
  }
  drain();
}

test("ingestLines does not retain the chunk a hit was sliced from", () => {
  // The npm script passes --expose-gc; without it the measurement is noise.
  const gc = (globalThis as { gc?: () => void }).gc;
  assert.ok(gc, "run this suite with --expose-gc");

  const SESSIONS = 500;
  const PER_SESSION = 50;
  const filler = "x".repeat(1150);
  const sessions = new Map<string, SessionMeta>();
  const lines: string[] = [];
  // Corpus lines are grouped by session, which is what makes this expensive:
  // each session's best line comes from a chunk no other session's does.
  for (let i = 0; i < SESSIONS; i++) {
    const key = `s${i}`;
    sessions.set(key, session({ key }));
    for (let seq = 0; seq < PER_SESSION; seq++) {
      const words = seq === PER_SESSION - 1 ? "deploy cache" : "cache";
      lines.push(`${key}\t${seq}\t${words} ${filler}`);
    }
  }

  const store = new ResultStore();
  store.sessions = sessions;
  store.startQuery(["deploy", "cache"]);

  gc();
  const before = process.memoryUsage().heapUsed;
  pumpInto(store, lines);
  gc();
  const retained = process.memoryUsage().heapUsed - before;

  assert.equal(store.hits.size, SESSIONS);
  // Storing the slice as-is pins one 64KB chunk per session (~32MB here) and at
  // the real session count blows the command's 100MB heap; a detached copy pins
  // one 1.2KB line (~0.6MB). The bound is loose enough to ignore GC slack.
  const mb = retained / 1024 / 1024;
  assert.ok(mb < 8, `retained ${mb.toFixed(1)}MB of chunk`);
});

// The command's first paint is seeded from the manifest during the initial
// render, so a store that has only been seeded — no ingest, no flush — has to
// produce the recent-session rows on its own. Regressing this puts an empty
// list on screen until the first background flush lands.
test("a seeded store builds rows before anything is ingested", () => {
  const store = new ResultStore();
  store.seed([
    session({ key: "old", mtimeMs: 1 }),
    session({ key: "new", mtimeMs: 2 }),
  ]);

  const rows = store.buildRows(true);
  assert.deepEqual(
    rows.map((r) => r.session.key),
    ["new", "old"],
  );
});

test("a seeded store honours the filter on its first build", () => {
  const store = new ResultStore();
  store.seed([session({ key: "in" }), session({ key: "out" })]);
  store.allow = (s) => s.key === "in";

  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["in"],
  );
});

test("seed replaces the previous snapshot rather than merging into it", () => {
  const store = new ResultStore();
  store.seed([session({ key: "gone" })]);
  store.seed([session({ key: "kept" })]);

  assert.deepEqual([...store.sessions.keys()], ["kept"]);
});

// A rebuild reports a list that starts empty and grows, so replacing on those
// batches collapses the seeded list to whatever has been re-indexed so far.
test("merge keeps sessions the partial list does not mention", () => {
  const store = new ResultStore();
  store.seed([session({ key: "a" }), session({ key: "b" })]);
  store.merge([session({ key: "c" })]);

  assert.deepEqual([...store.sessions.keys()].sort(), ["a", "b", "c"]);
});

test("merge lands a re-indexed session on its existing entry", () => {
  const store = new ResultStore();
  store.seed([session({ key: "a", title: "stale" })]);
  store.merge([session({ key: "a", title: "fresh" })]);

  assert.equal(store.sessions.size, 1);
  assert.equal(store.sessions.get("a")?.title, "fresh");
});

test("ingestLines stores the matched text verbatim", () => {
  const store = new ResultStore();
  store.sessions = new Map([["a1", session({ key: "a1" })]]);
  store.startQuery(["deploy"]);
  // The lone surrogate is what corpus chunking leaves when it cuts a pair.
  const text = "deploy \u{1F680} \ud83d tail";
  store.ingestLines([`a1\t0\t${text}`]);
  assert.equal(store.hits.get("a1")?.text, text);
});

/**
 * A store with two sessions and a query typed, pinned to `pin`. The pin is what
 * keeps the open detail pane's List.Item mounted across a restart: unmount it
 * and React discards the transcript it had read.
 */
function pinnedStore(pin: string) {
  const store = new ResultStore();
  store.seed([session({ key: "pin" }), session({ key: "other" })]);
  store.pinned = () => pin;
  store.startQuery(["deploy"]);
  // Every restart re-arms the grace period the pin lives in.
  store.sweeping = true;
  return store;
}

test("the pinned session leads the list through a query restart", () => {
  const store = pinnedStore("pin");
  store.ingestLines(["other\t0\tdeploy the thing"]);

  // Its own hit has not arrived — the sweep only just restarted — so it is on
  // screen on the strength of the pin alone, and ahead of a session that has
  // already matched.
  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["pin", "other"],
  );
});

test("the pinned session keeps its place once its hit lands", () => {
  const store = pinnedStore("pin");
  store.ingestLines(["other\t0\tdeploy deploy deploy", "pin\t7\tdeploy"]);
  store.sweeping = false;

  const rows = store.buildRows(true);
  assert.deepEqual(
    rows.map((r) => r.session.key),
    ["pin", "other"],
  );
  // Carrying the hit, so the pane marks the same words the ranking used.
  assert.equal(rows[0].hit?.seq, 7);
});

// The grace period ends when the sweep ends, covered or not. Holding the pin
// on the chance that a truncated sweep skipped a matching line would leave a
// row matching nothing at the top for as long as the pane stays open, since
// every keystroke re-arms it.
test("a finished sweep that never matched the pinned session drops it", () => {
  const store = pinnedStore("pin");
  store.ingestLines(["other\t0\tdeploy the thing"]);
  store.sweeping = false;

  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["other"],
  );
});

test("a dropped pin does not linger through a build that keeps its rows", () => {
  const store = pinnedStore("pin");
  store.ingestLines(["other\t0\tdeploy the thing"]);
  store.buildRows(true);
  store.sweeping = false;

  // `resort: false` replays the previous order, which the pin is in; a row with
  // no hit must not survive there either.
  assert.deepEqual(
    store.buildRows(false).map((r) => r.session.key),
    ["other"],
  );
});

// `freeze` promises the highlighted row stays put while results stream. The
// pin must not smuggle a reorder past it: the row is already on screen with the
// user looking at it, and the pin exists to keep it mounted, not to move it.
test("a pinned row already on screen keeps its slot when the list is frozen", () => {
  const store = pinnedStore("other");
  store.ingestLines(["pin\t0\tdeploy it", "other\t0\tdeploy it"]);
  // The list as last painted, with the user arrowed down to the second row and
  // the pane opened on it.
  store.order = ["pin", "other"];

  assert.deepEqual(
    store.buildRows(false).map((r) => r.session.key),
    ["pin", "other"],
  );
  // A build that is ranking from scratch does lead with it, which is what
  // carries it through the restart that clears `order`.
  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["other", "pin"],
  );
});

test("the filter outranks the pin", () => {
  const store = pinnedStore("pin");
  store.ingestLines(["pin\t0\tdeploy the thing", "other\t0\tdeploy it"]);
  store.allow = (s) => s.key !== "pin";

  // A scope the pinned session is outside of is a filter the user just set;
  // holding its pane open would show a row the scope excludes.
  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["other"],
  );
});

test("the pinned session leads the unsearched list too", () => {
  const store = new ResultStore();
  store.seed([
    session({ key: "pin", mtimeMs: 1 }),
    session({ key: "recent", mtimeMs: 2 }),
  ]);
  store.pinned = () => "pin";

  // Clearing the search bar drops every hit; the pane stays open, so its row
  // has to outrank recency.
  assert.deepEqual(
    store.buildRows(true).map((r) => r.session.key),
    ["pin", "recent"],
  );
});

test("a hit carries the seq of the message it was cut from", () => {
  const store = new ResultStore();
  store.sessions = new Map([["a1", session({ key: "a1" })]]);
  store.startQuery(["deploy"]);
  store.ingestLines(["a1\t42\tdeploy the thing"]);
  // The detail pane reads the transcript around this number, so a hit that
  // reported the wrong one would open the pane on an unrelated message.
  assert.equal(store.hits.get("a1")?.seq, 42);
});
