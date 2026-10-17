import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchReply } from "../src/digup/protocol";
import { parseQuery, SearchSession, toFilter, type SearchBackend, type SessionState } from "../src/search/session";
import { hit } from "./fixtures";

type Params = Parameters<SearchBackend["search"]>[0];

class FakeBackend implements SearchBackend {
  searches: { params: Params; resolve(reply: SearchReply): void; reject(error: Error): void }[] = [];
  ahead: string[] = [];

  search(params: Params) {
    return new Promise<SearchReply>((resolve, reject) => this.searches.push({ params, resolve, reject }));
  }

  embedAhead(q: string, code: boolean) {
    this.ahead.push(`${code ? "code:" : ""}${q}`);
  }
}

function harness() {
  const backend = new FakeBackend();
  const states: SessionState[] = [];
  let timers: (() => void)[] = [];
  const session = new SearchSession(backend, (state) => states.push(state), {
    setTimer: (run) => {
      timers.push(run);
      return run;
    },
    clearTimer: (handle) => {
      timers = timers.filter((run) => run !== handle);
    },
  });
  return {
    backend,
    states,
    session,
    /** Typing stopped: the timers that are waiting go off. */
    typingPauses: () => {
      const due = timers;
      timers = [];
      for (const run of due) run();
    },
    waiting: () => timers.length,
    last: () => states.at(-1),
  };
}

const found = (paths: string[], meaning: boolean): SearchReply => ({
  hits: paths.map((path) => hit({ path })),
  strong: paths.length,
  meaning,
});
const settled = () => new Promise((resolve) => setImmediate(resolve));

test("a filter narrows the kinds; `code:` or the Code filter searches code", () => {
  assert.deepEqual(parseQuery("  zebra ", "all"), { text: "zebra", code: false });
  assert.deepEqual(parseQuery("zebra", "video"), { text: "zebra", code: false, kinds: ["video"] });
  assert.deepEqual(parseQuery("retry with backoff", "code"), { text: "retry with backoff", code: true });
  assert.deepEqual(parseQuery("Code: retry", "pdf"), { text: "retry", code: true });
  assert.deepEqual(parseQuery("code:", "all"), { text: "", code: true });
  assert.deepEqual(parseQuery("decode: this", "all"), { text: "decode: this", code: false });
});

test("a saved filter that no longer applies falls back to all files", () => {
  assert.equal(toFilter("pdf", false), "pdf");
  assert.equal(toFilter("code", true), "code");
  assert.equal(toFilter("code", false), "all");
  assert.equal(toFilter("hologram", true), "all");
  assert.equal(toFilter(undefined, true), "all");
});

test("nothing typed is the empty state, and nothing is asked", () => {
  const { backend, session, last, waiting } = harness();
  session.update("   ", "all");
  assert.deepEqual(last(), { query: { text: "", code: false }, phase: "empty", reply: null, loading: false });
  assert.equal(backend.searches.length, 0);
  assert.equal(waiting(), 0);
});

test("typing shows word matches at once, then matches by meaning when typing pauses", async () => {
  const { backend, session, last, typingPauses } = harness();
  session.update("zebra", "video");
  assert.equal(last()?.loading, true);
  assert.deepEqual(backend.searches[0].params, { q: "zebra", code: false, meaning: false, kinds: ["video"] });
  assert.deepEqual(backend.ahead, ["zebra"]);
  assert.equal(backend.searches.length, 1);

  backend.searches[0].resolve(found(["/v/zebra.mp4"], false));
  await settled();
  assert.equal(last()?.phase, "words");
  assert.equal(last()?.loading, true);
  assert.equal(last()?.reply?.hits[0].path, "/v/zebra.mp4");

  typingPauses();
  assert.deepEqual(backend.searches[1].params, { q: "zebra", code: false, meaning: true, kinds: ["video"] });
  backend.searches[1].resolve(found(["/v/zoo.mp4", "/v/zebra.mp4"], true));
  await settled();
  assert.equal(last()?.phase, "meaning");
  assert.equal(last()?.loading, false);
  assert.equal(last()?.reply?.hits.length, 2);
});

test("an answer to something typed earlier never replaces what is typed now", async () => {
  const { backend, session, last, typingPauses, waiting } = harness();
  session.update("z", "all");
  session.update("ze", "all");
  assert.equal(waiting(), 1); // the first keystroke's pause was called off
  backend.searches[1].resolve(found(["/new.jpg"], false));
  await settled();
  backend.searches[0].resolve(found(["/old.jpg"], false));
  await settled();
  assert.equal(last()?.reply?.hits[0].path, "/new.jpg");

  typingPauses();
  session.update("zeb", "all");
  backend.searches[2].resolve(found(["/stale-meaning.jpg"], true));
  await settled();
  assert.equal(last()?.query.text, "zeb");
  assert.notEqual(last()?.reply?.hits[0].path, "/stale-meaning.jpg");
});

test("word matches that arrive after the meaning matches don't replace them", async () => {
  const { backend, session, last, typingPauses } = harness();
  session.update("zebra", "all");
  typingPauses();
  backend.searches[1].resolve(found(["/by-meaning.jpg"], true));
  await settled();
  backend.searches[0].resolve(found(["/by-words.jpg"], false));
  await settled();
  assert.equal(last()?.phase, "meaning");
  assert.equal(last()?.reply?.hits[0].path, "/by-meaning.jpg");
});

test("without the model the pause still answers, with words only and the helper's warning", async () => {
  const { backend, session, last, typingPauses } = harness();
  session.update("zebra", "all");
  typingPauses();
  backend.searches[1].resolve({ ...found(["/zebra.txt"], false), warning: "meaning search is off" });
  await settled();
  assert.equal(last()?.phase, "wordsOnly");
  assert.equal(last()?.warning, "meaning search is off");
  assert.equal(last()?.loading, false);
});

test("a failed search says why and stops loading; an old failure says nothing", async () => {
  const { backend, session, last, typingPauses } = harness();
  session.update("zebra", "all");
  backend.searches[0].resolve(found(["/zebra.txt"], false));
  await settled();
  typingPauses();
  backend.searches[1].reject(new Error("DigUp's search helper stopped."));
  await settled();
  assert.equal(last()?.error, "DigUp's search helper stopped.");
  assert.equal(last()?.loading, false);
  assert.equal(last()?.reply?.hits[0].path, "/zebra.txt"); // what was showing stays

  session.update("zebras", "all");
  assert.equal(last()?.error, undefined);
  backend.searches[2].reject(new Error("old"));
  session.update("zebras!", "all");
  await settled();
  assert.equal(last()?.error, undefined);
});

test("clearing the field empties the results and calls off the pause", async () => {
  const { backend, session, last, waiting } = harness();
  session.update("zebra", "all");
  session.update("", "all");
  assert.equal(waiting(), 0);
  backend.searches[0].resolve(found(["/late.jpg"], false));
  await settled();
  assert.equal(last()?.phase, "empty");
  assert.equal(last()?.reply, null);
});

test("after it is disposed of, nothing more is reported", async () => {
  const { backend, session, states, waiting } = harness();
  session.update("zebra", "all");
  const before = states.length;
  session.dispose();
  assert.equal(waiting(), 0);
  backend.searches[0].resolve(found(["/late.jpg"], false));
  await settled();
  assert.equal(states.length, before);
});
