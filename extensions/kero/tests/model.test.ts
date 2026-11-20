import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGroups, matchesStatus, normalizeStatus, parseProjects, parseSessions } from "../src/lib/model";

const projects = parseProjects([
  { id: "p1", name: "kero", dir: "/work/oss/kero" },
  { id: "p2", name: "kero", dir: "/work/personal/kero" },
]);

const sessions = parseSessions([
  {
    id: "s2",
    project: "p2",
    name: "Review",
    panes: [
      {
        id: "a",
        title: "Agent",
        dir: "/home",
        processDir: "/work/personal/kero",
        agent: "pi",
        process: "node",
        status: "working",
        progress: 40,
        git: { branch: "feature/search" },
      },
      { id: "b", process: "zsh", dir: "/work/personal/kero", status: "idle", progress: -1 },
    ],
  },
  { id: "s1", project: "p1", name: "Server", panes: [{ id: "c", status: "waiting" }] },
]);

test("groups by project ID in sidebar order, including duplicate project names", () => {
  const groups = buildGroups(sessions, projects);
  assert.deepEqual(
    groups.map((g) => g.id),
    ["p1", "p2"],
  );
  assert.deepEqual(
    groups.map((g) => g.subtitle),
    ["/work/oss/kero", "/work/personal/kero"],
  );
  assert.equal(groups[1].items.length, 2);
});

test("one row per pane with explicit target and process directory", () => {
  const item = buildGroups(sessions, projects)[1].items[0];
  assert.equal(item.id, "a");
  assert.equal(item.sessionId, "s2");
  assert.equal(item.title, "Review › Agent");
  assert.equal(item.directory, "/work/personal/kero");
  assert.equal(item.program, "pi");
  assert.equal(item.progress, 40);
  for (const keyword of [
    "kero",
    "p2",
    "Review",
    "s2",
    "a",
    "/home",
    "/work/personal/kero",
    "pi",
    "node",
    "feature/search",
  ]) {
    assert.ok(item.keywords.includes(keyword), `Missing search keyword: ${keyword}`);
  }
  assert.equal(buildGroups(sessions, projects)[0].items[0].title, "Server");
  assert.equal(buildGroups(sessions, projects)[1].items[1].progress, undefined);
});

test("multi-pane titles use a hierarchy separator without rewriting terminal titles or paths", () => {
  const title = "user@host:~/work/project / terminal";
  const [group] = buildGroups(
    parseSessions([
      {
        id: "s",
        name: "Review / work",
        panes: [
          { id: "a", title },
          { id: "b", title: "shell" },
        ],
      },
    ]),
    [],
  );
  assert.equal(group.items[0].title, `Review / work › ${title}`);
  assert.equal(group.items[1].title, "Review / work › shell");
  assert.ok(group.items[0].keywords.includes(title));
});

test("copy targets distinguish session and pane IDs even for single-pane sessions", () => {
  const [group] = buildGroups(parseSessions([{ id: "session-single", panes: [{ id: "pane-single" }] }]), []);
  assert.equal(group.items[0].sessionId, "session-single");
  assert.equal(group.items[0].id, "pane-single");
});

test("panes share their owning session ID but retain distinct pane targets", () => {
  const [group] = buildGroups(
    parseSessions([
      { id: "session-a", panes: [{ id: "pane-a1" }, { id: "pane-a2" }] },
      { id: "session-b", panes: [{ id: "pane-b1" }] },
    ]),
    [],
  );
  assert.deepEqual(
    group.items.map((item) => ({ sessionId: item.sessionId, paneId: item.id })),
    [
      { sessionId: "session-a", paneId: "pane-a1" },
      { sessionId: "session-a", paneId: "pane-a2" },
      { sessionId: "session-b", paneId: "pane-b1" },
    ],
  );
});

test("handles missing projects, optional fields, and future statuses", () => {
  const groups = buildGroups(
    parseSessions([
      { id: "s1", panes: [{ id: "a", status: "future", progress: 101 }] },
      { id: "s2", project: "deleted", panes: [{ id: "b", dir: "/tmp", processDir: "" }] },
    ]),
    [],
  );
  assert.equal(groups[0].title, "Other Sessions");
  assert.equal(groups[0].items[0].status, "unknown");
  assert.equal(groups[0].items[0].progress, undefined);
  assert.equal(groups[1].title, "Project deleted");
  assert.equal(groups[1].items[0].directory, "/tmp");
  assert.deepEqual(buildGroups([], projects), []);
});

test("status filters use Kero states, not process presence", () => {
  for (const status of ["working", "waiting", "idle", "error", "exited", "unknown"] as const) {
    assert.equal(matchesStatus(status, "all"), true);
    assert.equal(matchesStatus(status, "attention"), status === "waiting" || status === "error");
    for (const filter of ["working", "idle", "exited"] as const) {
      assert.equal(matchesStatus(status, filter), status === filter);
    }
  }
  assert.equal(normalizeStatus(undefined), "unknown");
});

test("status changes do not reorder panes", () => {
  const before = buildGroups(sessions, projects).flatMap((g) => g.items.map((p) => p.id));
  const changed = structuredClone(sessions);
  changed[0].panes[0].status = "error";
  const after = buildGroups(changed, projects).flatMap((g) => g.items.map((p) => p.id));
  assert.deepEqual(after, before);
});

test("rejects malformed structural JSON and duplicate pane IDs", () => {
  for (const value of [
    null,
    {},
    [{ id: "s" }],
    [{ id: "s", panes: [{}] }],
    [{ id: "s", panes: [{ id: "a" }, { id: "a" }] }],
  ]) {
    assert.throws(() => parseSessions(value));
  }
  assert.throws(() => parseProjects({}));
  assert.throws(() => parseProjects([{ name: "no-id" }]));
});

test("shows the same shell label regardless of process field or other panes", () => {
  const groups = buildGroups(
    parseSessions([
      { id: "single", panes: [{ id: "base", shell: "zsh", status: "idle" }] },
      {
        id: "multi",
        panes: [
          { id: "nested", process: "zsh", shell: "zsh", status: "idle" },
          { id: "agent", agent: "pi", shell: "zsh", status: "working" },
          { id: "other-shell", shell: "zsh", status: "idle" },
        ],
      },
    ]),
    [],
  );
  const items = groups.flatMap((group) => group.items);
  assert.deepEqual(
    items.map((item) => item.program),
    ["zsh", "zsh", "pi", "zsh"],
  );
  for (const item of items.filter((item) => item.program === "zsh")) {
    assert.ok(item.keywords.includes("zsh"));
  }
  assert.ok(!items[2].keywords.includes("zsh"), "An agent's underlying shell is not its current program");
});

test("current program prefers agent, then foreground program, then shell", () => {
  const [group] = buildGroups(
    parseSessions([
      {
        id: "s",
        panes: [
          { id: "a", agent: "claude", process: "node", shell: "zsh" },
          { id: "b", process: "python", shell: "bash" },
          { id: "c", shell: "fish" },
          { id: "d", agent: "", process: "", shell: "zsh" },
        ],
      },
    ]),
    [],
  );
  assert.deepEqual(
    group.items.map((item) => item.program),
    ["claude", "python", "fish", "zsh"],
  );
});

test("browser label takes precedence over shell and stale terminal fields", () => {
  const [group] = buildGroups(
    parseSessions([
      {
        id: "s",
        panes: [
          { id: "a", url: "about:blank", agent: "pi", process: "node", shell: "zsh" },
          { id: "b", url: "https://example.com" },
          { id: "c", url: "", shell: "zsh" },
        ],
      },
    ]),
    [],
  );
  assert.deepEqual(
    group.items.map((item) => item.program),
    ["Browser", "Browser", "zsh"],
  );
  assert.ok(group.items[0].keywords.includes("Browser"));
});

test("exited panes never present a configured shell or historical program as current", () => {
  const [group] = buildGroups(
    parseSessions([
      {
        id: "s",
        panes: [
          { id: "a", shell: "zsh", status: "exited" },
          { id: "b", agent: "pi", process: "node", shell: "zsh", status: "exited" },
          { id: "c", url: "about:blank", status: "exited" },
        ],
      },
    ]),
    [],
  );
  assert.ok(group.items.every((item) => item.program === undefined && item.status === "exited"));
});

test("missing or invalid shell metadata does not invent a current program", () => {
  const [group] = buildGroups(
    parseSessions([
      {
        id: "s",
        panes: [
          { id: "a" },
          { id: "b", shell: 42 },
          { id: "c", shell: "" },
          { id: "d", command: ["node", "old-command.js"], runtime: "node" },
        ],
      },
    ]),
    [],
  );
  assert.ok(group.items.every((item) => item.program === undefined));
});

test("shell fallback preserves automatic titles and full directory values", () => {
  const title = "user@host:~/work/project";
  const directory = "/Users/user/work/project";
  const [group] = buildGroups(
    parseSessions([{ id: "s", panes: [{ id: "a", title, dir: directory, shell: "zsh", status: "idle" }] }]),
    [],
  );
  const item = group.items[0];
  assert.equal(item.program, "zsh");
  assert.equal(item.title, title);
  assert.equal(item.directory, directory);
  assert.ok(item.keywords.includes(title));
  assert.ok(item.keywords.includes(directory));
});

test("ignores unknown fields and invalid optional data", () => {
  const [session] = parseSessions([
    { id: "s", future: true, panes: [{ id: "a", title: 123, git: null, progress: "50" }] },
  ]);
  assert.equal(session.panes[0].title, undefined);
  assert.equal(session.panes[0].progress, undefined);
  assert.equal(session.panes[0].git, undefined);
  assert.equal(parseProjects([{ id: "p" }])[0].name, "p");
});
