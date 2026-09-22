import assert from "node:assert/strict";
import { test } from "node:test";

import { readFileSync } from "node:fs";

import type { OrcaTerminal, OrcaWorktree } from "../src/orca.ts";
import {
  buildSections,
  cleanTitle,
  sessionLabel,
  sessionTitle,
  filterRows,
  mergeAgents,
  summarize,
  unwrap,
} from "../src/orca.ts";

/** Real snapshots of a running Orca, taken while one agent sat on AskUserQuestion. */
function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8")).result;
}

const terminals = fixture<{ terminals: OrcaTerminal[] }>("terminal-list").terminals;
const worktrees = fixture<{ worktrees: OrcaWorktree[] }>("worktree-ps").worktrees;

test("pairs a terminal with its agent by tabId:leafId", () => {
  const merged = mergeAgents(terminals, worktrees);
  const blocked = merged.find((row) => row.handle === "term_api-1");

  assert.equal(blocked?.state, "waiting");
  assert.equal(blocked?.toolName, "AskUserQuestion");
  // What the agent was asked is what the row should be able to show.
  assert.match(blocked?.prompt ?? "", /^\/review https:\/\/example\.com/);
});

test("the waiting filter keeps only agents that stopped for input", () => {
  const rows = filterRows(mergeAgents(terminals, worktrees), "waiting", "all-agents");

  assert.deepEqual(
    rows.map((row) => row.state),
    ["waiting", "waiting"],
  );
});

test("the codex filter drops claude panes", () => {
  const rows = filterRows(mergeAgents(terminals, worktrees), "all", "codex");

  assert.deepEqual(
    rows.map((row) => row.agentIdentity),
    ["codex"],
  );
});

test("only the everything filter includes plain shells", () => {
  const merged = mergeAgents(terminals, worktrees);
  const shells = (agent: "all-agents" | "everything") =>
    filterRows(merged, "all", agent).filter((row) => !row.agentIdentity).length;

  assert.equal(shells("all-agents"), 0);
  assert.equal(shells("everything"), 1);
});

test("waiting agents lead the list, longest wait first", () => {
  const rows = filterRows(mergeAgents(terminals, worktrees), "all", "all-agents");

  const [first, ...rest] = buildSections(rows);

  assert.equal(first.kind, "waiting");
  assert.deepEqual(
    first.items.map((row) => row.agentIdentity),
    ["codex", "claude"],
  );
  assert.ok(rest.every((section) => section.kind === "project"));
});

test("the summary counts waiting agents first and clears when idle", () => {
  const rows = mergeAgents(terminals, worktrees);

  assert.equal(summarize(rows, "counts"), "2 waiting · 1 working");
  assert.equal(summarize(rows.filter((row) => row.state === "done"), "counts"), null);
});

test("in waiting mode the summary lists the blocked sessions", () => {
  const rows = mergeAgents(terminals, worktrees);

  assert.equal(
    summarize(rows, "sessions", 80),
    "❓ infra: refactor handlers · ❓ api: /review work_items/450 (leave…",
  );
  assert.equal(summarize(rows.filter((row) => row.state === "done"), "sessions"), null);
});

test("sessions that do not fit are trimmed, then give way to projects", () => {
  const rows = mergeAgents(terminals, worktrees);

  // The project always stays; only the session name gives ground.
  assert.equal(
    summarize(rows, "sessions", 45),
    "❓ infra: refactor han… · ❓ api: /review work…",
  );
  // No room left for names worth reading: the projects still identify them.
  assert.equal(summarize(rows, "sessions", 20), "❓ infra · ❓ api");
  // Too narrow even for that: keep what fits and count the rest.
  assert.equal(summarize(rows, "sessions", 10), "❓ infra +1");
});

test("unwrap surfaces the message Orca reported on failure", () => {
  const failure = JSON.stringify({
    ok: false,
    error: { code: "no_runtime", message: "Orca runtime is not reachable" },
  });

  assert.throws(() => unwrap(failure), /Orca runtime is not reachable/);
  assert.deepEqual(unwrap(JSON.stringify({ ok: true, result: { a: 1 } })), { a: 1 });
});

test("a title Orca could not generate is replaced by the prompt", () => {
  const row = {
    title: "✳ Claude Code",
    agentIdentity: "claude",
    prompt: "/review https://example.com/team/project/-/work_items/450 (leave it for later)",
  };

  assert.equal(sessionTitle(row), "/review work_items/450 (leave it for later)");
});

test("a real title from Orca is left alone", () => {
  assert.equal(
    sessionTitle({ title: "◑ Rework the landing copy", agentIdentity: "claude", prompt: "anything" }),
    "Rework the landing copy",
  );
  // Nothing to fall back on: the bare agent name still beats an empty row.
  assert.equal(sessionTitle({ title: "✳ 06", agentIdentity: "claude" }), "06");
  // The limit applies to Orca's own titles too, or a caller's budget is a lie.
  assert.equal(
    sessionTitle({ title: "◑ Rework the landing copy", agentIdentity: "claude" }, 14),
    "Rework the la…",
  );
});

test("a session named from a long prompt keeps its text in the summary", () => {
  const one = mergeAgents(terminals, worktrees)
    .filter((row) => row.handle === "term_api-2")
    .map((row) => ({
      ...row,
      title: "✳ Claude Code",
      agentIdentity: "claude",
      prompt: "Sort out the report export",
    }));

  assert.equal(summarize(one, "sessions", 60), "❓ infra: Sort out the report export");
  // Narrower: the session is still named, just trimmed to what fits.
  assert.ok(summarize(one, "sessions", 25)!.startsWith("❓ infra: So"));
  assert.ok(summarize(one, "sessions", 25)!.length <= 25);
});

test("a waiting row is labelled project-first, like the root search subtitle", () => {
  const row = {
    title: "✳ Claude Code",
    agentIdentity: "claude",
    prompt: "/review work_items/450",
    worktreePath: "/Users/you/code/api",
  };

  assert.equal(sessionLabel(row, true), "api: /review work_items/450");
  assert.equal(sessionLabel(row, false), "/review work_items/450");
});

test("projects with the same folder name stay separate sections", () => {
  const rows = [
    { handle: "a", worktreePath: "/code/team-a/app", worktreeId: "r1::/code/team-a/app",
      title: "one", connected: true, lastOutputAt: 2, state: "done" },
    { handle: "b", worktreePath: "/code/team-b/app", worktreeId: "r2::/code/team-b/app",
      title: "two", connected: true, lastOutputAt: 1, state: "done" },
  ];

  const sections = buildSections(rows);

  assert.equal(sections.length, 2);
  assert.deepEqual(
    sections.map((section) => section.key),
    ["team-a/app", "team-b/app"],
  );
});

test("a pane Orca has not titled yet does not break the list", () => {
  // Orca sends title: null for a freshly opened terminal.
  assert.doesNotThrow(() => cleanTitle(null));
  assert.equal(cleanTitle(null), "");

  assert.equal(
    sessionTitle({ title: null, agentIdentity: "claude", prompt: "Fix the export" }),
    "Fix the export",
  );
  // Nothing to show at all: the agent name beats an empty row.
  assert.equal(sessionTitle({ title: null, agentIdentity: "claude" }), "claude");
  assert.equal(sessionTitle({ title: null }), "Terminal");
});
