import { test } from "node:test";
import assert from "node:assert/strict";
import { appOfProcess, inHerdr, locate } from "../../src/lib/agents/locate.ts";
import { jumpToAgent, loadAgents, mergeAgents } from "../../src/lib/agents/load.ts";
import type { Tab } from "../../src/lib/tabs/model.ts";
import { fakePlatform } from "../fake-platform.ts";
import { agent, proc } from "./helpers.ts";

const iterm = { bundleId: "com.googlecode.iterm2", name: "iTerm", path: "/Applications/iTerm.app", pid: 10 };
const ghostty = { bundleId: "com.mitchellh.ghostty", name: "Ghostty", path: "/Applications/Ghostty.app", pid: 20 };
const claudeApp = { bundleId: "com.anthropic.claudefordesktop", name: "Claude", path: "/Applications/Claude.app" };

// iTerm (10) → iTermServer (11) → login (12) → zsh (13, ttys004) → claude (14); Ghostty (20) → zsh (21) → codex (22)
const processes = [
  proc(10, 1, "", "iTerm2"),
  proc(11, 1, "", "iTermServer"), // re-parented to launchd, like iTerm's real server
  proc(12, 10, "ttys004", "login"),
  proc(13, 12, "ttys004", "zsh"),
  proc(14, 13, "ttys004", "claude"),
  proc(21, 20, "ttys009", "zsh"),
  proc(22, 21, "ttys009", "codex"),
  proc(30, 1, "", "herdr"), // herdr server
  proc(31, 30, "ttys020", "zsh"),
  proc(32, 31, "ttys020", "codex"),
  proc(40, 13, "ttys004", "herdr"), // a herdr client in the iTerm tab
];
const byPid = new Map(processes.map((p) => [p.pid, p]));

const tab = (key: string, panes: { id: string; tty: string }[]): Tab => ({
  key,
  app: iterm,
  source: "iterm",
  kind: "tab",
  title: key,
  active: false,
  ref: {},
  panes,
});

test("a process belongs to the app among its ancestors", () => {
  assert.equal(appOfProcess(14, byPid, [iterm, ghostty])?.name, "iTerm");
  assert.equal(appOfProcess(22, byPid, [iterm, ghostty])?.name, "Ghostty");
  assert.equal(appOfProcess(32, byPid, [iterm, ghostty]), undefined);
  assert.equal(inHerdr(32, byPid), true);
  assert.equal(inHerdr(14, byPid), false);
});

test("locate: terminal agents to their exact pane, else their app; places to their tab; links", async () => {
  const asked: string[][] = [];
  const herdrTab = { ...tab("herdr:/s:w1", []), source: "herdr" };
  const located = await locate(
    [
      agent("claude", { host: { kind: "process", pid: 14, tty: "ttys004" } }),
      agent("codex", { host: { kind: "process", pid: 22, tty: "ttys009" } }),
      agent("cursor", { host: { kind: "link", bundleId: claudeApp.bundleId, url: "cursor://x", label: "Cursor › a" } }),
      agent("desktop", {
        host: { kind: "place", tabKey: "claude:s", bundleId: claudeApp.bundleId, url: "claude://x" },
      }),
      agent("herdr", {
        host: { kind: "place", tabKey: "herdr:/s:w1", paneId: "w1:p1", bundleId: iterm.bundleId, label: "herdr › api" },
      }),
      agent("lost", { host: { kind: "process", pid: 999, tty: "" } }),
    ],
    [iterm, ghostty, claudeApp],
    processes,
    async (apps) => {
      asked.push(apps.map((a) => a.name));
      return [tab("zsh", [{ id: "S1", tty: "ttys004" }]), herdrTab];
    },
  );
  // Apps of places with a link aren't read (the Claude app's sidebar is slow): the link opens them.
  assert.deepEqual(asked, [["iTerm", "Ghostty"]]);
  const by = new Map(located.map((a) => [a.key, a.location]));
  assert.deepEqual(
    [by.get("claude")?.label, by.get("claude")?.paneId, by.get("claude")?.tab?.key],
    ["iTerm › zsh", "S1", "zsh"],
  );
  assert.deepEqual([by.get("codex")?.label, by.get("codex")?.tab], ["Ghostty", undefined]);
  assert.deepEqual([by.get("cursor")?.label, by.get("cursor")?.url], ["Cursor › a", "cursor://x"]);
  assert.deepEqual(
    [by.get("desktop")?.app.name, by.get("desktop")?.label, by.get("desktop")?.url, by.get("desktop")?.tab],
    ["Claude", "Claude", "claude://x", undefined],
  );
  assert.deepEqual(
    [by.get("herdr")?.label, by.get("herdr")?.tab?.key, by.get("herdr")?.paneId],
    ["herdr › api (iTerm)", "herdr:/s:w1", "w1:p1"],
  );
  assert.equal(by.get("lost"), undefined);
});

test("locate: tabs already read (Search) are used as they are, and find places whose app wasn't read", async () => {
  const claudeTab = { ...tab("claude:s", []), app: claudeApp, source: "claude" };
  const [desktop] = await locate(
    [agent("desktop", { host: { kind: "place", tabKey: "claude:s", bundleId: claudeApp.bundleId, url: "claude://x" } })],
    [claudeApp],
    [],
    [claudeTab],
  );
  assert.deepEqual([desktop.location?.tab?.key, desktop.location?.label], ["claude:s", "Claude"]);
});

test("merge: herdr's pane hosts the session it shares; CLIs inside herdr or claimed by a source drop out", () => {
  const merged = mergeAgents(
    [
      agent("claude:s1", { source: "claude", status: "working", sessionIds: ["s1"] }),
      agent("herdr:p1", {
        source: "herdr",
        status: "working",
        sessionIds: ["s1"],
        host: { kind: "place", tabKey: "herdr:/s:w1", paneId: "p1" },
      }),
      agent("herdr:p2", { source: "herdr", host: { kind: "place", tabKey: "herdr:/s:w1", paneId: "p2" } }),
      agent("cli:32", { source: "cli", status: "unknown", host: { kind: "process", pid: 32, tty: "ttys020" } }),
      agent("codex:t", { source: "codex", host: { kind: "process", pid: 22, tty: "ttys009" } }),
      agent("cli:22", { source: "cli", status: "unknown", host: { kind: "process", pid: 22, tty: "ttys009" } }),
    ],
    (pid) => inHerdr(pid, byPid),
  );
  assert.deepEqual(
    merged.map((a) => [a.key, a.host.kind]),
    [
      ["claude:s1", "place"],
      ["herdr:p2", "place"],
      ["codex:t", "process"],
    ],
  );
});

test("loadAgents: sources in parallel, a failing one reported, projects attached, most urgent first", async () => {
  const platform = fakePlatform({
    processes: async () => processes,
    readFiles: async (dir) =>
      dir.endsWith(".claude/sessions")
        ? [{ path: "14.json", text: JSON.stringify({ pid: 14, sessionId: "s", cwd: "/r/app/src", status: "waiting" }) }]
        : [],
    listDir: async () => {
      throw new Error("disk on fire");
    },
    gitRepos: async (dirs) => dirs.map(() => ({ root: "/r/app", mainRoot: "/r/app" })),
  });
  const result = await loadAgents([iterm, ghostty], platform, {
    tabs: async () => [tab("zsh", [{ id: "S1", tty: "ttys004" }])],
    now: 1000,
  });
  assert.deepEqual(result.failures, [
    { source: "codex", message: "disk on fire" },
    { source: "herdr", message: "disk on fire" },
  ]);
  assert.deepEqual(
    platform.reports.map((r) => r.context),
    ["agents: codex", "agents: herdr"],
  );
  assert.deepEqual(
    result.agents.map((a) => [a.product, a.status, a.location?.label, a.project?.name]),
    [
      ["Claude Code", "blocked", "iTerm › zsh", "app"],
      ["Codex", "unknown", "Ghostty", undefined],
      ["Codex", "unknown", undefined, undefined],
    ],
  );
});

test("jumping selects the tab and pane with the tab's source, else opens the link, and marks the agent seen", async () => {
  const calls: string[] = [];
  const platform = fakePlatform({
    runAppleScript: async (script) => (calls.push(script.includes('"S1"') ? "select S1" : script), "ok"),
    openUrl: async (url) => void calls.push(`open ${url}`),
  });
  const location = { app: iterm, label: "iTerm", tab: tab("zsh", [{ id: "S1", tty: "ttys004" }]), paneId: "S1", url: "x://" };
  const app = await jumpToAgent({ ...agent("a"), location }, platform, 42);
  await jumpToAgent({ ...agent("b"), location: { app: claudeApp, label: "Claude", url: "claude://x" } }, platform, 43);
  assert.equal(app.name, "iTerm");
  assert.deepEqual(calls, ["select S1", "open claude://x"]);
  assert.deepEqual(await platform.loadJson("agents:seen", {}), { a: 42, b: 43 });
  await assert.rejects(jumpToAgent(agent("nowhere"), platform, 1), /Can't tell where/);
});

test("locate: in a terminal without ttys (Ghostty), the one pane in the agent's folder, never a guess between two", async () => {
  const withCwd = processes.map((p) => (p.pid === 22 ? { ...p, cwd: "/p/app" } : p));
  const ghosttyTab = (key: string, panes: { id: string; cwd?: string }[]): Tab => ({
    ...tab(key, []),
    app: ghostty,
    source: "ghostty",
    panes,
  });
  const codex = agent("codex", { host: { kind: "process", pid: 22, tty: "ttys009" } });
  const one = await locate([codex], [ghostty], withCwd, async () => [
    ghosttyTab("a", [{ id: "A", cwd: "/p/app" }]),
    ghosttyTab("b", [{ id: "B", cwd: "/p/other" }]),
  ]);
  assert.deepEqual([one[0].location?.tab?.key, one[0].location?.paneId], ["a", "A"]);
  const two = await locate([codex], [ghostty], withCwd, async () => [
    ghosttyTab("a", [{ id: "A", cwd: "/p/app" }]),
    ghosttyTab("b", [{ id: "B", cwd: "/p/app" }]),
  ]);
  assert.deepEqual([two[0].location?.label, two[0].location?.tab], ["Ghostty", undefined]);
});
