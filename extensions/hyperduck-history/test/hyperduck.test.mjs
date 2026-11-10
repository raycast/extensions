import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  appleSecondsToUnixMs,
  createSerialQueue,
  displayTitle,
  HyperduckError,
  mergeLinks,
  parseEntry,
  parseHistory,
  readHyperduckHistory,
} from "../src/hyperduck.ts";

const entry = (id, url, date) => JSON.stringify({ date, id, url });

describe("appleSecondsToUnixMs", () => {
  it("maps the 2001 reference date to Unix time", () => {
    assert.equal(appleSecondsToUnixMs(0), Date.UTC(2001, 0, 1));
    assert.equal(appleSecondsToUnixMs(1.5), Date.UTC(2001, 0, 1) + 1500);
  });
});

describe("parseEntry", () => {
  it("parses a Hyperduck JSON string", () => {
    assert.deepEqual(parseEntry(entry("A", "https://example.com/a", 10)), {
      id: "A",
      url: "https://example.com/a",
      date: appleSecondsToUnixMs(10),
    });
  });

  it("skips malformed entries", () => {
    assert.equal(parseEntry("{not json"), undefined);
    assert.equal(parseEntry(JSON.stringify({ id: "A", date: 1 })), undefined);
    assert.equal(parseEntry(JSON.stringify({ id: "A", url: "https://example.com", date: "x" })), undefined);
    assert.equal(parseEntry(42), undefined);
  });

  it("builds a stable id when the id is missing", () => {
    assert.equal(parseEntry(JSON.stringify({ url: "https://example.com", date: 5 })).id, "https://example.com@5");
  });
});

describe("parseHistory", () => {
  it("returns links newest first and drops bad entries", () => {
    const result = parseHistory([
      entry("old", "https://example.com/old", 1),
      "bad",
      entry("new", "https://example.com/new", 2),
    ]);
    assert.deepEqual(
      result.links.map((link) => link.id),
      ["new", "old"],
    );
    assert.equal(result.enabled, true);
  });

  it("treats a missing history as empty", () => {
    assert.deepEqual(parseHistory(undefined, false), { enabled: false, links: [] });
  });
});

describe("mergeLinks", () => {
  const link = (id, date) => ({ id, url: `https://example.com/${id}`, date });

  it("keeps archived links that left the current history", () => {
    const merged = mergeLinks([link("gone", 1), link("both", 2)], [link("both", 2), link("new", 3)]);
    assert.deepEqual(
      merged.map((l) => l.id),
      ["new", "both", "gone"],
    );
  });

  it("deduplicates by id and lets the current history win", () => {
    const merged = mergeLinks([{ ...link("x", 1), url: "https://example.com/stale" }], [link("x", 1)]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].url, "https://example.com/x");
  });

  it("drops hidden ids", () => {
    assert.deepEqual(
      mergeLinks([link("a", 1)], [link("b", 2)], ["a"]).map((l) => l.id),
      ["b"],
    );
  });
});

describe("displayTitle", () => {
  it("strips scheme, www and trailing slash", () => {
    assert.equal(displayTitle("https://www.example.com/"), "example.com");
    assert.equal(displayTitle("https://example.com/a/b?q=1"), "example.com/a/b?q=1");
  });

  it("keeps non-web URLs and truncates long titles", () => {
    assert.equal(displayTitle("mailto:someone@example.com"), "mailto:someone@example.com");
    assert.equal(displayTitle(`https://example.com/${"a".repeat(200)}`, 20).length, 20);
  });
});

describe("readHyperduckHistory", () => {
  const dir = mkdtempSync(join(tmpdir(), "hyperduck-test-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  const writePlist = (name, value) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(value));
    execFileSync("plutil", ["-convert", "binary1", path]);
    return path;
  };

  it("reads a binary plist with history and the enabled flag", async () => {
    const path = writePlist("full.plist", {
      isHistoryEnabled: false,
      history: [entry("a", "https://example.com/a", 100), entry("b", "https://example.com/b", 200)],
    });
    const result = await readHyperduckHistory(path);
    assert.equal(result.enabled, false);
    assert.deepEqual(
      result.links.map((l) => l.id),
      ["b", "a"],
    );
  });

  it("handles a plist without the history keys", async () => {
    const path = writePlist("empty.plist", { other: 1 });
    assert.deepEqual(await readHyperduckHistory(path), { enabled: true, links: [] });
  });

  it("reports a missing file", async () => {
    await assert.rejects(readHyperduckHistory(join(dir, "nope.plist")), (error) => {
      assert.ok(error instanceof HyperduckError);
      assert.equal(error.kind, "missing");
      return true;
    });
  });

  it("reports a refused read", { skip: process.getuid?.() === 0 }, async () => {
    const path = writePlist("locked.plist", { history: [] });
    chmodSync(path, 0o000);
    await assert.rejects(
      readHyperduckHistory(path),
      (error) => error instanceof HyperduckError && error.kind === "denied",
    );
  });

  it("reports a corrupt file", async () => {
    const path = join(dir, "corrupt.plist");
    writeFileSync(path, "not a plist");
    await assert.rejects(
      readHyperduckHistory(path),
      (error) => error instanceof HyperduckError && error.kind === "unreadable",
    );
  });
});

describe("createSerialQueue", () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  it("runs tasks one at a time, in call order", async () => {
    const enqueue = createSerialQueue();
    const events = [];
    let running = 0;
    const task = (name, ms) => async () => {
      running += 1;
      assert.equal(running, 1, "tasks overlapped");
      events.push(`start ${name}`);
      await sleep(ms);
      events.push(`end ${name}`);
      running -= 1;
      return name;
    };
    const results = await Promise.all([enqueue(task("a", 30)), enqueue(task("b", 5)), enqueue(task("c", 1))]);
    assert.deepEqual(results, ["a", "b", "c"]);
    assert.deepEqual(events, ["start a", "end a", "start b", "end b", "start c", "end c"]);
  });

  it("keeps running after a failed task", async () => {
    const enqueue = createSerialQueue();
    const failed = enqueue(async () => {
      throw new Error("boom");
    });
    const next = enqueue(async () => "ok");
    await assert.rejects(failed, /boom/);
    assert.equal(await next, "ok");
  });
});
