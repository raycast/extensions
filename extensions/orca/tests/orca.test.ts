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
  isUnseen,
  mergeAgents,
  projectNamer,
  orcaError,
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
  assert.throws(
    () => unwrap(JSON.stringify({ ok: false, error: { message: "Unknown command: agent launch" } })),
    /Update Orca/,
  );
  assert.deepEqual(unwrap(JSON.stringify({ ok: true, result: { a: 1 } })), { a: 1 });
});

/** What promisified execFile rejects with when the CLI exits non-zero. */
function cliFailure(stdout: string, stderr = "") {
  return Object.assign(
    new Error("Command failed: /Applications/Orca.app/orca agent launch --prompt secret prompt text"),
    { code: 1, stdout, stderr },
  );
}

test("a failing command reports what Orca said, not the command line with the prompt in it", () => {
  const error = orcaError(
    cliFailure(JSON.stringify({ ok: false, error: { code: "no_runtime", message: "Orca runtime is not reachable" } })),
  );

  assert.equal(error.message, "Orca runtime is not reachable");
});

test("a command or flag Orca does not know means Orca is too old", () => {
  const unknown = (message: string) =>
    orcaError(cliFailure(JSON.stringify({ ok: false, error: { code: "invalid_argument", message } }))).message;

  assert.match(unknown("Unknown command: agent launch"), /Update Orca to 1\.4\.229 or later/);
  assert.match(unknown("Unknown flag --wait-submit for command: terminal send"), /Update Orca/);
  // Same code, but a real mistake in the input: Orca's own words are the useful ones.
  assert.equal(unknown("Worktree not found: path:/gone"), "Worktree not found: path:/gone");
});

test("a missing CLI points at the preference", () => {
  const missing = Object.assign(new Error("spawn /nope/orca ENOENT"), { code: "ENOENT", path: "/nope/orca" });

  assert.match(orcaError(missing).message, /No Orca CLI at \/nope\/orca.*Orca CLI Path/);
});

test("output that is not Orca's envelope still hides the prompt", () => {
  assert.equal(orcaError(cliFailure("", "zsh: killed\n")).message, "zsh: killed");
  assert.equal(orcaError(cliFailure("not json")).message, "Orca CLI exited with code 1");
});

test("a CLI killed by a signal does not fall back to the command line", () => {
  const killed = Object.assign(cliFailure(""), { code: null, signal: "SIGTERM", killed: true });

  assert.equal(orcaError(killed).message, "Orca CLI was stopped by SIGTERM");
  assert.doesNotMatch(orcaError(killed).message, /secret prompt/);
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

test("with details open, a row outside its project section leads with the project", () => {
  const row = {
    title: "✳ Claude Code",
    agentIdentity: "claude",
    prompt: "/review work_items/450",
  };

  assert.equal(sessionLabel(row, "api"), "api: /review work_items/450");
  assert.equal(sessionLabel(row), "/review work_items/450");
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

test("blocked panes in two folders of the same name stay apart", () => {
  const rows = [
    { handle: "a", worktreePath: "/code/team-a/app", worktreeId: "r1::/code/team-a/app",
      title: "one", connected: true, lastOutputAt: 1, stateStartedAt: 1, state: "waiting" },
    { handle: "b", worktreePath: "/code/team-b/app", worktreeId: "r2::/code/team-b/app",
      title: "two", connected: true, lastOutputAt: 2, stateStartedAt: 2, state: "waiting" },
  ];

  assert.deepEqual(rows.map(projectNamer(rows)), ["team-a/app", "team-b/app"]);
  assert.equal(summarize(rows, "sessions", 200), "❓ team-a/app: one · ❓ team-b/app: two");
  // Down to project names alone, the two are still two.
  assert.equal(summarize(rows, "sessions", 30), "❓ team-a/app · ❓ team-b/app");
});

test("a folder name is qualified only when another project shares it", () => {
  const projectOf = projectNamer([
    { worktreePath: "/code/team-a/app" },
    { worktreePath: "/code/team-a/app" },
    { worktreePath: "/code/api" },
  ]);
  assert.equal(projectOf({ worktreePath: "/code/team-a/app" }), "app");
  assert.equal(projectOf({ worktreePath: "/code/api" }), "api");
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

/** The fixture with the docs worktree left unread, as Orca marks one whose agent finished unseen. */
function withUnreadDocs(): OrcaWorktree[] {
  return worktrees.map((worktree) =>
    worktree.path.endsWith("/docs") ? { ...worktree, unread: true } : worktree,
  );
}

test("a row carries whether Orca still marks its worktree unread", () => {
  const rows = mergeAgents(terminals, withUnreadDocs());

  assert.deepEqual(
    rows.filter((row) => row.unread).map((row) => row.handle),
    ["term_docs-1", "term_docs-2"],
  );
  assert.equal(isUnseen(rows.find((row) => row.handle === "term_docs-1")!), true);
  // A worktree Orca never flagged is not unread, null or not.
  assert.equal(rows.find((row) => row.handle === "term_web-1")?.unread, false);
});

test("by project, unseen finished agents get their own section under the waiting ones", () => {
  const rows = filterRows(mergeAgents(terminals, withUnreadDocs()), "all", "all-agents");

  const sections = buildSections(rows, "project");

  assert.deepEqual(
    sections.map((section) => section.kind),
    ["waiting", "unseen", "project", "project"],
  );
  // Most recently finished first.
  assert.deepEqual(
    sections[1].items.map((row) => row.handle),
    ["term_docs-1", "term_docs-2"],
  );
  // An unseen agent is not repeated under its project.
  assert.ok(sections.slice(2).every((section) => section.key !== "docs"));
});

test("by status, sections run waiting, unseen, working, finished, then the rest", () => {
  const merged = mergeAgents(terminals, withUnreadDocs());
  // Orca flags whole worktrees; clear the flag on one docs pane to get a finished
  // agent that has been looked at.
  const rows = filterRows(
    merged.map((row) =>
      row.handle === "term_docs-2" ? { ...row, unread: false } : row,
    ),
    "all",
    "everything",
  );

  const sections = buildSections(rows, "status");

  assert.deepEqual(
    sections.map((section) => section.kind),
    ["waiting", "unseen", "working", "finished", "other"],
  );
  assert.deepEqual(sections[1].items.map((row) => row.handle), ["term_docs-1"]);
  assert.deepEqual(sections[3].items.map((row) => row.handle), ["term_docs-2"]);
  // A pane with no agent state — a shell, or an agent Orca has no state for.
  assert.deepEqual(
    sections[4].items.map((row) => row.handle).sort(),
    ["term_api-3", "term_cli-1"],
  );
});

test("the counts summary includes agents that finished unseen", () => {
  const rows = mergeAgents(terminals, withUnreadDocs());

  assert.equal(summarize(rows, "counts"), "2 waiting · 1 working · 2 done");
  // Seen finished agents are no news.
  assert.equal(
    summarize(mergeAgents(terminals, worktrees).filter((row) => row.state === "done"), "counts"),
    null,
  );
});

test("with nobody blocked, the sessions summary falls back to the counts", () => {
  const rows = mergeAgents(terminals, withUnreadDocs()).filter(
    (row) => row.state !== "waiting",
  );

  assert.equal(summarize(rows, "sessions"), "1 working · 2 done");
});
