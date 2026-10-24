import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHit, parseLine, parseSearchReply, ServiceError } from "../src/digup/protocol";
import { RAW_CODE_HIT, RAW_IMAGE_HIT } from "./fixtures";

test("an image hit keeps its fields under camel-case names", () => {
  assert.deepEqual(parseHit(RAW_IMAGE_HIT), {
    path: "/Users/sam/Samples/photos/Animals-Penguin.jpg",
    kind: "image",
    segment: "image",
    segmentId: 68,
    score: 5.320931624136898,
    modified: 1791835808.4140496,
    size: 56906,
    info: { height: "768", width: "768" },
    z: 3.3209316241368976,
    cosine: 0.7589632272720337,
    keywordRank: 1,
  });
});

test("a code hit carries its lines, focus line and excerpt", () => {
  const parsed = parseHit(RAW_CODE_HIT);
  assert.equal(parsed?.loc, 1);
  assert.equal(parsed?.locEnd, 33);
  assert.equal(parsed?.focus, 8);
  assert.equal(parsed?.info.repo, "/Users/sam/Samples/code/billing-service");
  assert.match(parsed?.excerpt ?? "", /«retry»/);
});

test("a hit without a path is dropped; missing fields get defaults; unknown fields are ignored", () => {
  assert.equal(parseHit({ kind: "pdf" }), null);
  assert.equal(parseHit("nope"), null);
  assert.deepEqual(parseHit({ path: "/a/b.xyz", info: { pages: 3, odd: [1] }, hologram: true }), {
    path: "/a/b.xyz",
    kind: "file",
    segment: "name",
    segmentId: -1,
    score: 0,
    modified: 0,
    size: 0,
    info: { pages: "3" },
  });
});

test("a search reply lists its hits and never counts more strong ones than it has", () => {
  const reply = parseSearchReply({ id: 4, hits: [RAW_IMAGE_HIT, 7, RAW_CODE_HIT], strong: 9, meaning: true, ms: {} });
  assert.equal(reply.hits.length, 2);
  assert.equal(reply.strong, 2);
  assert.equal(reply.meaning, true);
  assert.equal("warning" in reply, false);
});

test("a reply's warning is kept, and a reply without hits is an empty one", () => {
  assert.deepEqual(parseSearchReply({ hits: [], strong: 0, meaning: false, warning: "meaning search is off" }), {
    hits: [],
    strong: 0,
    meaning: false,
    warning: "meaning search is off",
  });
  assert.deepEqual(parseSearchReply({}), { hits: [], strong: 0, meaning: false });
});

test("a failed request throws what the helper said", () => {
  assert.throws(
    () => parseSearchReply({ ok: false, error: "unknown op nope" }),
    (error: unknown) => error instanceof ServiceError && error.kind === "request" && error.message === "unknown op nope",
  );
});

test("lines are told apart: replies, events, and everything else", () => {
  assert.deepEqual(parseLine('{"id":3,"ok":true}'), { type: "reply", id: 3, body: { id: 3, ok: true } });
  assert.deepEqual(parseLine('{"event":"ready","index":"/idx"}'), {
    type: "event",
    event: { event: "ready", index: "/idx" },
  });
  assert.deepEqual(parseLine('{"error":"worker not found","event":"encoder","state":"unavailable"}'), {
    type: "event",
    event: { event: "encoder", state: "unavailable", error: "worker not found" },
  });
  assert.deepEqual(parseLine('{"event":"encoder","seconds":0.4,"state":"ready"}'), {
    type: "event",
    event: { event: "encoder", state: "ready" },
  });
  assert.deepEqual(parseLine('{"event":"indexing","done":3}'), { type: "event", event: { event: "other", name: "indexing" } });
  assert.deepEqual(parseLine('{"event":"encoder","state":"melting"}'), {
    type: "event",
    event: { event: "other", name: "encoder" },
  });
  for (const junk of ["not json", "[1,2]", '"text"', '{"id":null,"ok":true}', "{}"]) {
    assert.deepEqual(parseLine(junk), { type: "junk" });
  }
});
