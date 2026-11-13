import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentActionArgs,
  buildDispatchAgentArgs,
  buildListAgentsArgs,
  getAgentSection,
  isAgentControlVersionSupported,
  isDaemonUnreachableMessage,
  LatestRequestGuard,
  parseAgentSessionsJson,
} from "../src/lib/agent-control-core.ts";

test("parses mixed agent records and ignores malformed entries", () => {
  const agents = parseAgentSessionsJson(
    JSON.stringify([
      {
        id: "job_123",
        cwd: "/tmp/project",
        kind: "background",
        startedAt: 200,
        state: "blocked",
        waitingFor: "Approval",
        extra: true,
      },
      {
        sessionId: "session-1",
        cwd: "/tmp/foreground",
        kind: "interactive",
        startedAt: 100,
        status: "busy",
      },
      { id: "missing-fields" },
    ]),
  );

  assert.equal(agents.length, 2);
  assert.equal(agents[0].id, "job_123");
  assert.equal(getAgentSection(agents[0]), "needs-input");
  assert.equal(getAgentSection(agents[1]), "foreground");
});

test("keeps unknown future states visible", () => {
  const [agent] = parseAgentSessionsJson(
    JSON.stringify([
      {
        id: "job_future",
        cwd: "/tmp/project",
        kind: "background",
        startedAt: 1,
        state: "paused-by-policy",
      },
    ]),
  );
  assert.equal(agent.state, "unknown");
  assert.equal(agent.rawState, "paused-by-policy");
  assert.equal(getAgentSection(agent), "unknown");
});

test("classifies legacy status-only background records", () => {
  const [agent] = parseAgentSessionsJson(
    JSON.stringify([
      {
        id: "job_status",
        cwd: "/tmp/project",
        kind: "background",
        startedAt: 1,
        status: "busy",
      },
    ]),
  );
  assert.equal(getAgentSection(agent), "working");
});

test("keeps unknown agent kinds read-only", () => {
  const [agent] = parseAgentSessionsJson(
    JSON.stringify([
      {
        id: "job_future_kind",
        cwd: "/tmp/project",
        kind: "remote",
        startedAt: 1,
        state: "working",
      },
    ]),
  );
  assert.equal(agent.kind, "unknown");
  assert.equal(agent.rawKind, "remote");
  assert.equal(getAgentSection(agent), "unknown");
});

test("deduplicates a background job attached in an interactive terminal", () => {
  const agents = parseAgentSessionsJson(
    JSON.stringify([
      {
        id: "job_1",
        sessionId: "session-1",
        cwd: "/tmp/project",
        kind: "background",
        startedAt: 2,
        state: "working",
      },
      {
        sessionId: "session-1",
        cwd: "/tmp/project",
        kind: "interactive",
        startedAt: 3,
        status: "busy",
      },
    ]),
  );
  assert.deepEqual(
    agents.map((agent) => agent.id),
    ["job_1"],
  );
});

test("rejects invalid JSON roots", () => {
  assert.throws(() => parseAgentSessionsJson("{}"), /invalid agent list/i);
  assert.throws(() => parseAgentSessionsJson("{"), /invalid agent JSON/i);
});

test("builds stable list and action arguments", () => {
  assert.deepEqual(buildListAgentsArgs(false), ["agents", "--json"]);
  assert.deepEqual(buildListAgentsArgs(true), ["agents", "--json", "--all"]);
  assert.deepEqual(buildAgentActionArgs("logs", "agent_12-ab"), [
    "logs",
    "agent_12-ab",
  ]);
  assert.throws(
    () => buildAgentActionArgs("stop", "--all"),
    /invalid agent ID/i,
  );
});

test("keeps the dispatch task as one argument", () => {
  const task = "Fix 'quotes'\nthen print $(whoami); 你好";
  const args = buildDispatchAgentArgs({
    projectPath: "/tmp/project",
    task,
    name: "release helper",
    model: "sonnet",
    effort: "high",
    permissionMode: "auto",
  });

  assert.deepEqual(args, [
    "--bg",
    "--name",
    "release helper",
    "--model",
    "sonnet",
    "--effort",
    "high",
    "--permission-mode",
    "auto",
    task,
  ]);
});

test("checks the Claude Code agent-control version floor", () => {
  assert.equal(isAgentControlVersionSupported("2.1.168"), false);
  assert.equal(isAgentControlVersionSupported("2.1.169 (Claude Code)"), true);
  assert.equal(isAgentControlVersionSupported("2.2.0"), true);
  assert.equal(isAgentControlVersionSupported("unknown"), false);
});

test("recognizes only documented daemon-unreachable failures", () => {
  assert.equal(
    isDaemonUnreachableMessage(
      "couldn't confirm abc was stopped because the daemon exited",
    ),
    true,
  );
  assert.equal(
    isDaemonUnreachableMessage("the background service may be restarting"),
    true,
  );
  assert.equal(isDaemonUnreachableMessage("permission denied"), false);
});

test("publishes only the latest interleaved request", async () => {
  const guard = new LatestRequestGuard();
  const published: string[] = [];
  let resolveFirst: ((value: string) => void) | undefined;
  let resolveSecond: ((value: string) => void) | undefined;
  const first = new Promise<string>((resolve) => (resolveFirst = resolve));
  const second = new Promise<string>((resolve) => (resolveSecond = resolve));
  const run = async (promise: Promise<string>) => {
    const request = guard.begin();
    const value = await promise;
    if (guard.isCurrent(request)) published.push(value);
  };

  const firstRun = run(first);
  const secondRun = run(second);
  resolveSecond?.("all");
  await secondRun;
  resolveFirst?.("active");
  await firstRun;
  assert.deepEqual(published, ["all"]);
});
