// src/ behaviors that the lib tests can't reach, run against a stand-in for @raycast/api:
// Preferences are a mutable object, LocalStorage is a Map.
import { beforeEach, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fake, resetFake, tmp } from "./raycast-mock";

const storage = await import("../src/storage");
const deliver = await import("../src/deliver");

beforeEach(resetFake);

describe("Preferences are read live, under the new keys", () => {
  test("the same prefs() object reports a changed Save Folder (a reopened command never remounts)", () => {
    fake.prefs = { saveFolder: "/a" };
    const p = storage.prefs();
    expect(p.outputFolder).toBe("/a");
    fake.prefs = { saveFolder: "/b" };
    expect(p.outputFolder).toBe("/b");
  });

  test("saveFolder and customPatternsFolder feed the folders; the old picker keys are ignored", () => {
    fake.prefs = { saveFolder: "~/x", customPatternsFolder: "/c", outputFolder: "/old", myPatternsFolder: "/old" };
    const p = storage.prefs();
    expect(p.outputFolder).toMatch(/\/x$/);
    expect(p.outputFolder?.startsWith("~")).toBe(false);
    expect(p.myPatternsFolder).toBe("/c");
  });
});

describe("saveAnswer writes to the Save Folder as it is now", () => {
  test("switching folders after the run started saves to the new one, and the old one stays empty", () => {
    const a = join(tmp, "A");
    const b = join(tmp, "B");
    fake.prefs = { saveFolder: a };
    storage.prefs(); // the run started with A
    fake.prefs = { saveFolder: b };
    const path = deliver.saveAnswer("hi", "summarize", "x");
    expect(path.startsWith(`${b}/`)).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("hi");
    expect(() => readdirSync(a)).toThrow(); // never created
  });

  test("with no Save Folder it refuses instead of guessing", () => {
    fake.prefs = {};
    expect(() => deliver.saveAnswer("hi", "summarize", "x")).toThrow(/Save Folder/);
  });
});

describe("movePin moves the typed id", () => {
  test("a renamed strategy keeps its pin under strategy:<new>", async () => {
    const s = storage.usageStore();
    await s.togglePin("strategy:old");
    await storage.movePin("strategy", "old", "new");
    expect((await s.load()).pins).toEqual(["strategy:new"]);
  });

  test("a new item (no previous name) moves nothing", async () => {
    const s = storage.usageStore();
    await s.togglePin("strategy:undefined");
    await storage.movePin("strategy", undefined, "new");
    expect((await s.load()).pins).toEqual(["strategy:undefined"]);
  });
});

describe("countRun never holds up or breaks a run", () => {
  test("a saved count reaches the view", async () => {
    const seen: unknown[] = [];
    await storage.countRun(storage.usageStore(), "pattern:summarize", (u) => seen.push(u.counts));
    expect(seen).toEqual([{ "pattern:summarize": 1 }]);
  });

  test("a count that fails to save neither throws nor rejects, and leaves the view alone", async () => {
    fake.failWrites = true;
    const seen: unknown[] = [];
    const rejections: unknown[] = [];
    const onRejection = (e: unknown) => rejections.push(e);
    process.on("unhandledRejection", onRejection);
    try {
      // Awaiting it would throw if the failed write leaked out as a rejection.
      await storage.countRun(storage.usageStore(), "pattern:summarize", (u) => seen.push(u));
      await new Promise((r) => setImmediate(r)); // lets an unhandled rejection surface
    } finally {
      process.off("unhandledRejection", onRejection);
    }
    expect({ seen, rejections }).toEqual({ seen: [], rejections: [] });
  });
});
