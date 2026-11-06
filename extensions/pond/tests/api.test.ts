import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PondApiError } from "pond-api";
import { PondProblem, problemCopy, problemOf, supportsApi, toError } from "../src/api/problems";
import { clip, summarize } from "../src/api/summary";
import { clampLimit, decodeCursor, encodeCursor, parseSavedSince } from "../src/api/tool-input";
import { SAVE } from "./fixtures";

describe("problems", () => {
  test("needs Local API 2.1 or a later 2.x", () => {
    assert.equal(supportsApi("2.1.0"), true);
    assert.equal(supportsApi("2.4.0"), true);
    assert.equal(supportsApi("2.0.3"), false);
    assert.equal(supportsApi("3.0.0"), false);
    assert.equal(supportsApi(undefined), false);
  });

  test("maps API errors to the fix you need", () => {
    assert.equal(problemOf(new PondApiError("no", "authentication")).kind, "unauthorized");
    assert.equal(problemOf(new PondApiError("down", "connection")).kind, "not-running");
    assert.equal(problemOf(new PondApiError("missing route", "not-found", 404)).kind, "outdated");
    assert.equal(problemOf(new PondApiError("missing save", "not-found", 404, "save_not_found")).kind, "failed");
    assert.equal(problemOf(new Error("boom")).kind, "failed");
  });

  test("keeps problems that already know their kind", () => {
    const problem = new PondProblem("misconfigured", "Bad URL.");
    assert.equal(problemOf(problem), problem);
    assert.match(problemCopy(problem).description, /extension preferences/);
  });

  test("toError wraps thrown values", () => {
    const error = new Error("x");
    assert.equal(toError(error), error);
    assert.equal(toError("nope").message, "nope");
  });
});

describe("summaries", () => {
  test("keep what a model needs", () => {
    const summary = summarize({ ...SAVE, note: "n".repeat(600) });
    assert.equal(summary.title, "Calm interfaces");
    assert.equal(summary.source, "twitter");
    assert.equal(summary.sourceName, "Twitter");
    assert.equal(summary.pondUrl, "pond://item/save-1?library=lib-1");
    assert.equal(summary.savedAt, "2026-10-20T12:00:00.000Z");
    assert.equal(summary.note?.length, 501);
    assert.equal(summary.hasText, true);
    assert.equal(summary.inTrash, false);
  });

  test("clip leaves short text alone", () => {
    assert.equal(clip("short", 10), "short");
    assert.equal(clip("longer text", 6), "longer…");
  });
});

describe("tool input", () => {
  test("reads dates as UTC and rejects nonsense", () => {
    assert.equal(parseSavedSince("2026-10-01"), Date.UTC(2026, 9, 1));
    assert.equal(parseSavedSince("2026-10-01T09:00:00+05:30"), Date.UTC(2026, 9, 1, 3, 30));
    assert.equal(parseSavedSince(" "), undefined);
    assert.throws(() => parseSavedSince("last week"), /isn't a date/);
  });

  test("cursors round-trip as opaque strings", () => {
    const cursor = { value: 1, id: "save-1", libraryId: "lib-1" };
    const encoded = encodeCursor(cursor);
    assert.ok(encoded && !encoded.includes("{"));
    assert.deepEqual(decodeCursor(encoded ?? undefined), cursor);
    assert.equal(encodeCursor(null), null);
    assert.throws(() => decodeCursor("not-a-cursor"), /cursor isn't valid/);
  });

  test("limits stay in range", () => {
    assert.equal(clampLimit(undefined, 20, 50), 20);
    assert.equal(clampLimit(0, 20, 50), 20);
    assert.equal(clampLimit(500, 20, 50), 50);
    assert.equal(clampLimit(-3, 20, 50), 1);
  });
});
