import { test } from "node:test";
import assert from "node:assert/strict";
import { applySeen, nextAgent, sortAgents } from "../../src/lib/agents/status.ts";
import { agent } from "./helpers.ts";

test("idle agents active since last seen are done; first sightings count as seen", () => {
  const { agents, seen } = applySeen(
    [
      agent("a", { activeAt: 50 }), // Hopper saw it at 10
      agent("b", { activeAt: 50, seenAt: 60 }), // its app says it was looked at after
      agent("c", { activeAt: 50 }), // new to Hopper
      agent("d", { status: "working", activeAt: 50 }),
    ],
    { a: 10, gone: 1 },
    100,
  );
  assert.deepEqual(
    agents.map((a) => [a.key, a.status]),
    [
      ["a", "done"],
      ["b", "idle"],
      ["c", "idle"],
      ["d", "working"],
    ],
  );
  assert.deepEqual(seen, { a: 10, c: 100, d: 100 });
});

test("sorted most urgent first; waiting agents oldest first, the rest newest first", () => {
  const sorted = sortAgents([
    agent("idle", { since: 5 }),
    agent("new-blocked", { status: "blocked", since: 9 }),
    agent("old-blocked", { status: "blocked", since: 1 }),
    agent("working", { status: "working", since: 3 }),
    agent("done", { status: "done", since: 2 }),
    agent("web", { status: "unknown" }),
  ]);
  assert.deepEqual(
    sorted.map((a) => a.key),
    ["old-blocked", "new-blocked", "done", "working", "idle", "web"],
  );
});

test("Next Agent visits waiting agents in turn, skipping ones it can't jump to", () => {
  const here = { app: { bundleId: "x", name: "x", path: "/x" }, label: "x" };
  const agents = [
    { ...agent("b1", { status: "blocked", since: 1 }), location: here },
    { ...agent("b2", { status: "blocked", since: 2 }), location: undefined },
    { ...agent("d1", { status: "done", since: 3 }), location: here },
    { ...agent("w", { status: "working" }), location: here },
  ];
  assert.equal(nextAgent(agents)?.key, "b1");
  assert.equal(nextAgent(agents, "b1")?.key, "d1");
  assert.equal(nextAgent(agents, "d1")?.key, "b1");
  assert.equal(nextAgent([{ ...agent("i"), location: here }]), undefined);
});
