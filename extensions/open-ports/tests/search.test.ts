import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankListeners } from "../src/core/search";
import { listenersFrom, row } from "./fixtures";

const LISTENERS = listenersFrom(
  row({ pid: 100, command: "node", address: "*:3000" }),
  row({ pid: 200, command: "nodemon", address: "*:5432" }),
  row({ pid: 3000, command: "postgres", address: "*:9999" }),
  row({ pid: 400, command: "redis-server", user: "redis", address: "127.0.0.1:6379" }),
);

describe("rankListeners", () => {
  it("returns everything for an empty query", () => {
    assert.equal(rankListeners(LISTENERS, "").length, 4);
    assert.equal(rankListeners(LISTENERS, "   ").length, 4);
  });

  it("ranks an exact port above a process whose PID happens to match", () => {
    const [first] = rankListeners(LISTENERS, "3000");
    assert.equal(first.port, 3000);
    assert.equal(first.command, "node");
  });

  it("ranks an exact name above a prefix match", () => {
    const [first, second] = rankListeners(LISTENERS, "node");
    assert.equal(first.command, "node");
    assert.equal(second.command, "nodemon");
  });

  it("matches on user and bind address too", () => {
    assert.deepEqual(
      rankListeners(LISTENERS, "redis").map((listener) => listener.pid),
      [400],
    );
    assert.deepEqual(
      rankListeners(LISTENERS, "127.0.0.1").map((listener) => listener.pid),
      [400],
    );
  });

  it("is case insensitive and drops non-matches", () => {
    assert.equal(rankListeners(LISTENERS, "POSTGRES").length, 1);
    assert.equal(rankListeners(LISTENERS, "nothing-here").length, 0);
  });
});
