import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { type Host, fetchFromHosts, numberWindows, readHosts, tabKey, windowKey } from "../src/lib/hosts.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "raycast-firefox-hosts-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeRecord(firefoxPid: number, record: Record<string, unknown>) {
  mkdirSync(join(dir, "hosts"), { recursive: true });
  writeFileSync(join(dir, "hosts", `${firefoxPid}.json`), JSON.stringify({ firefoxPid, ...record }));
}

const allAlive = () => true;

describe("readHosts", () => {
  test("lists every registered host, ordered by Firefox PID", () => {
    writeRecord(600, { pid: 1600, port: 26395, profilePath: "/profiles/b" });
    writeRecord(500, { pid: 1500, port: 26394, profilePath: "/profiles/a" });

    assert.deepEqual(readHosts(dir, allAlive), [
      { key: "500", pid: 1500, firefoxPid: 500, port: 26394, profilePath: "/profiles/a" },
      { key: "600", pid: 1600, firefoxPid: 600, port: 26395, profilePath: "/profiles/b" },
    ]);
  });

  test("skips hosts that have not started their HTTP server yet", () => {
    writeRecord(500, { pid: 1500, port: null });
    assert.deepEqual(readHosts(dir, allAlive), []);
  });

  test("skips hosts whose process has exited", () => {
    writeRecord(500, { pid: 1500, port: 26394 });
    writeRecord(600, { pid: 1600, port: 26395 });

    const hosts = readHosts(dir, (pid) => pid === 1600);

    assert.deepEqual(
      hosts.map((h) => h.key),
      ["600"]
    );
  });

  test("skips corrupt records and non-JSON files", () => {
    mkdirSync(join(dir, "hosts"));
    writeFileSync(join(dir, "hosts", "500.json"), "{not json");
    writeFileSync(join(dir, "hosts", "600.json.tmp.1600"), "{}");
    writeRecord(700, { pid: 1700, port: 26396 });

    assert.deepEqual(
      readHosts(dir, allAlive).map((h) => h.key),
      ["700"]
    );
  });

  test("treats a missing or non-string profile path as unknown", () => {
    writeRecord(500, { pid: 1500, port: 26394, profilePath: 42 });
    assert.equal(readHosts(dir, allAlive)[0].profilePath, null);
  });

  test("falls back to the shared port file from hosts without records", () => {
    writeFileSync(join(dir, "port"), "26394\n");
    assert.deepEqual(readHosts(dir, allAlive), [
      { key: "port-26394", pid: null, firefoxPid: null, port: 26394, profilePath: null },
    ]);
  });

  test("ignores the shared port file once any host has a record", () => {
    writeFileSync(join(dir, "port"), "26394");
    writeRecord(600, { pid: 1600, port: 26395 });
    assert.deepEqual(
      readHosts(dir, allAlive).map((h) => h.port),
      [26395]
    );
  });

  test("returns nothing when no host is running", () => {
    assert.deepEqual(readHosts(dir, allAlive), []);
  });

  test("rejects an invalid port in the shared port file", () => {
    writeFileSync(join(dir, "port"), "99999");
    assert.deepEqual(readHosts(dir, allAlive), []);
  });
});

describe("fetchFromHosts", () => {
  const host = (key: string): Host => ({ key, pid: 1, firefoxPid: 1, port: 1, profilePath: null });

  test("combines results from every host in host order", async () => {
    const result = await fetchFromHosts([host("a"), host("b")], async (h) => [`${h.key}1`, `${h.key}2`]);
    assert.deepEqual(result, ["a1", "a2", "b1", "b2"]);
  });

  test("leaves out a failing host so the others still show", async () => {
    const result = await fetchFromHosts([host("a"), host("b")], async (h) => {
      if (h.key === "a") throw new Error("a is down");
      return ["b1"];
    });
    assert.deepEqual(result, ["b1"]);
  });

  test("rejects with the first error when every host fails", async () => {
    await assert.rejects(
      fetchFromHosts([host("a"), host("b")], async (h) => {
        throw new Error(`${h.key} is down`);
      }),
      { message: "a is down" }
    );
  });

  test("resolves empty for no hosts", async () => {
    assert.deepEqual(await fetchFromHosts([], async () => ["x"]), []);
  });
});

describe("tabKey and windowKey", () => {
  test("keep the same tab and window IDs from different profiles apart", () => {
    const a = { host: { key: "500" }, id: 1, windowId: 17 };
    const b = { host: { key: "600" }, id: 1, windowId: 17 };
    assert.notEqual(tabKey(a), tabKey(b));
    assert.notEqual(windowKey(a), windowKey(b));
  });
});

describe("numberWindows", () => {
  const tab = (hostKey: string, windowId: number, id = windowId) => ({ host: { key: hostKey }, id, windowId });

  test("numbers windows from 1, grouped by profile order then window ID", () => {
    const tabs = [tab("b", 9), tab("a", 30), tab("a", 4), tab("b", 2), tab("a", 4, 99)];
    const order = (key: string) => ({ a: 0, b: 1 }[key] ?? 0);

    const numbers = numberWindows(tabs, order);

    assert.deepEqual(
      [...numbers],
      [
        ["a:4", 1],
        ["a:30", 2],
        ["b:2", 3],
        ["b:9", 4],
      ]
    );
  });

  test("gives the same window ID in two profiles two numbers", () => {
    const numbers = numberWindows([tab("a", 17), tab("b", 17)], () => 0);
    assert.deepEqual([...numbers.values()].sort(), [1, 2]);
  });

  test("falls back to host key order when profiles share an order", () => {
    const numbers = numberWindows([tab("b", 1), tab("a", 5)], () => 0);
    assert.equal(numbers.get("a:5"), 1);
    assert.equal(numbers.get("b:1"), 2);
  });
});
