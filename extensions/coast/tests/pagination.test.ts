import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pageFetchedPrefix, pageItems, pageText } from "../src/pagination";

describe("pagination", () => {
  it("continues past the old 20 and 50 item tails", () => {
    const source = Array.from({ length: 73 }, (_, index) => index);
    const first = pageItems(source, {}, 20);
    const last = pageItems(source, {
      offset: first.pagination.next_offset!,
      limit: 53,
    });

    assert.deepEqual(first.items, source.slice(0, 20));
    assert.deepEqual(last.items, source.slice(20));
    assert.equal(last.pagination.has_more, false);
    assert.equal(last.pagination.next_offset, undefined);
    assert.equal(last.pagination.total_count, 73);
  });

  it("caps only the response page while keeping later items accessible", () => {
    const source = Array.from({ length: 430 }, (_, index) => index);
    const first = pageItems(source, { limit: 300 });
    const second = pageItems(source, { offset: 200, limit: 300 });

    assert.equal(first.items.length, 200);
    assert.equal(first.pagination.limit, 200);
    assert.equal(first.pagination.next_offset, 200);
    assert.deepEqual(second.items, source.slice(200, 400));
    assert.equal(second.pagination.next_offset, 400);
  });

  it("does not claim a fetched ranking prefix is the complete source", () => {
    const sourcePrefix = Array.from({ length: 221 }, (_, index) => index);
    const first = pageFetchedPrefix(sourcePrefix, { offset: 20, limit: 200 });
    const exhausted = pageFetchedPrefix(sourcePrefix.slice(0, 220), {
      offset: 20,
      limit: 200,
    });

    assert.equal(first.pagination.has_more, true);
    assert.equal(first.pagination.total_count, undefined);
    assert.equal(exhausted.pagination.has_more, false);
    assert.equal(exhausted.pagination.total_count, 220);
  });

  it("rejects invalid offsets and limits instead of silently coercing them", () => {
    assert.throws(() => pageItems([], { offset: -1 }), /offset/);
    assert.throws(() => pageItems([], { offset: 1.5 }), /offset/);
    assert.throws(
      () => pageItems([], { offset: Number.MAX_SAFE_INTEGER + 1 }),
      /offset/,
    );
    assert.throws(
      () => pageItems([], { offset: Number.MAX_SAFE_INTEGER, limit: 2 }),
      /offset plus/,
    );
    assert.throws(() => pageItems([], { offset: Number.NaN }), /offset/);
    assert.throws(() => pageItems([], { limit: 0 }), /limit/);
    assert.throws(
      () => pageItems([], { limit: Number.POSITIVE_INFINITY }),
      /limit/,
    );
  });

  it("returns every text character through explicit continuation offsets", () => {
    const source = `${"a".repeat(50_009)}🐚tail`;
    const first = pageText(source, { maxCharacters: 60_000 });
    const second = pageText(source, {
      offset: first.pagination.next_offset!,
      maxCharacters: 20,
    });

    assert.equal([...first.text].length, 50_000);
    assert.equal(first.pagination.limit, 50_000);
    assert.equal(first.pagination.unit, "unicode-code-point");
    assert.equal(first.pagination.has_more, true);
    assert.equal(first.text + second.text, source);
    assert.equal(second.pagination.has_more, false);
  });
});
