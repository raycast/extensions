import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { tempDir } from "./helpers";

const CLI = join(process.cwd(), "assets", "agent-inbox.mjs");

test("the distributed CLI runs outside the extension without Raycast or node_modules", (t) => {
  const root = tempDir(t);
  const cli = join(root, "agent-inbox.mjs");
  copyFileSync(CLI, cli);
  const env = { ...process.env, AGENT_INBOX_HOME: join(root, "state"), NODE_PATH: "" };
  const run = (args: string[]) => execFileSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: "utf8" });
  assert.match(run(["--help"]), /usage:/);
  run(["event", "--agent", "test", "--session", "one", "--type", "started"]);
  const [session] = JSON.parse(run(["list", "--json"]));
  assert.equal(session.sessionId, "one");
  assert.equal(session.status, "idle");
});

test("CLI help succeeds without initializing state or requiring sqlite", (t) => {
  const root = tempDir(t);
  const state = join(root, "unused-state");
  const env = { ...process.env, AGENT_INBOX_HOME: state, AGENT_INBOX_SQLITE: join(root, "missing-sqlite") };
  for (const args of [["--help"], ["-h"], ["help"]]) {
    const result = spawnSync(process.execPath, [CLI, ...args], { env, encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 0, args.join(" "));
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /list \[--json\]/);
    assert.match(result.stdout, /watch \[--once\]/);
    assert.match(result.stdout, /install <agent/);
    assert.equal(existsSync(state), false, "help must not create config, logs or a database");
  }
});

test("hook CLI writes events into the database (built bundle)", (t) => {
  const home = tempDir(t);
  const env = {
    ...process.env,
    AGENT_INBOX_HOME: home,
    TMUX_PANE: "%7",
    TMUX: "/tmp/tmux-501/default,1,0",
    __CFBundleIdentifier: "com.mitchellh.ghostty",
  };
  const hook = (payload: object) =>
    execFileSync(process.execPath, [CLI, "hook", "claude"], { env, input: JSON.stringify(payload) });
  hook({ hook_event_name: "SessionStart", session_id: "s-1", cwd: "/work/chatcut" });
  hook({
    hook_event_name: "UserPromptSubmit",
    session_id: "s-1",
    cwd: "/work/chatcut",
    prompt: "chatcut 转场 shader 修复",
  });
  hook({
    hook_event_name: "Stop",
    session_id: "s-1",
    cwd: "/work/chatcut",
    last_assistant_message: "修好了，要我提交吗？",
  });
  // malformed input must not crash the agent
  execFileSync(process.execPath, [CLI, "hook", "claude"], { env, input: "not json" });

  execFileSync(
    process.execPath,
    [
      CLI,
      "hook",
      "codex-notify",
      JSON.stringify({ type: "agent-turn-complete", "thread-id": "t-9", cwd: "/w", "last-assistant-message": "ok." }),
    ],
    { env },
  );
  execFileSync(
    process.execPath,
    [
      CLI,
      "event",
      "--agent",
      "t3code",
      "--session",
      "x1",
      "--type",
      "needs_input",
      "--summary",
      "pick one",
      "--title",
      "Plan",
    ],
    { env },
  );

  const rows = JSON.parse(execFileSync(process.execPath, [CLI, "list", "--json"], { env, encoding: "utf8" }));
  const s = rows.find((r: { sessionId: string }) => r.sessionId === "s-1");
  assert.equal(s.status, "needs_input");
  assert.equal(s.attention, "question");
  assert.equal(s.title, "chatcut 转场 shader 修复");
  assert.equal(s.locator.tmuxPane, "%7");
  assert.equal(s.locator.tmuxSocket, "/tmp/tmux-501/default");
  assert.equal(s.locator.bundleId, "com.mitchellh.ghostty");
  assert.equal(rows.find((r: { sessionId: string }) => r.sessionId === "t-9").status, "ready");
  assert.equal(rows.find((r: { sessionId: string }) => r.sessionId === "x1").agent, "t3code");

  let log = "";
  try {
    log = readFileSync(join(home, "log.txt"), "utf8");
  } catch {
    log = "";
  }
  assert.equal(log, "", "no errors logged");
});

test("CLI reports usage errors and unknown sessions with nonzero exit codes", (t) => {
  const env = { ...process.env, AGENT_INBOX_HOME: tempDir(t) };
  for (const args of [
    [],
    ["unknown"],
    ["event"],
    ["event", "--agent", "test", "--session", "s", "--type", "invalid"],
  ]) {
    const result = spawnSync(process.execPath, [CLI, ...args], { env, encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage:/);
  }
  const missing = spawnSync(process.execPath, [CLI, "jump", "claude", "missing"], {
    env,
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /session not found/);
});

test("hook database failures are logged and never fail the calling agent", (t) => {
  const root = tempDir(t);
  const env = { ...process.env, AGENT_INBOX_HOME: root, AGENT_INBOX_SQLITE: join(root, "missing-sqlite") };
  const result = spawnSync(process.execPath, [CLI, "hook", "claude"], {
    env,
    input: JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "s", prompt: "hello" }),
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  assert.match(readFileSync(join(root, "log.txt"), "utf8"), /hook claude:.*sqlite3/);
});

test("ordinary CLI database failures return an error to scripts", (t) => {
  const root = tempDir(t);
  const env = { ...process.env, AGENT_INBOX_HOME: root, AGENT_INBOX_SQLITE: join(root, "missing-sqlite") };
  for (const args of [
    ["list", "--json"],
    ["event", "--agent", "test", "--session", "s", "--type", "progress"],
  ]) {
    const result = spawnSync(process.execPath, [CLI, ...args], { env, encoding: "utf8", timeout: 5000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sqlite3|ENOENT/);
  }
  assert.match(readFileSync(join(root, "log.txt"), "utf8"), /fatal:/);
});

test("Codex notify forwards the original payload and arguments even if recording fails", async (t) => {
  const root = tempDir(t);
  const capture = join(root, "notify.json");
  const helper = join(root, "notify.cjs");
  writeFileSync(helper, 'require("node:fs").writeFileSync(process.argv[2], JSON.stringify(process.argv.slice(3)));');
  const env = { ...process.env, AGENT_INBOX_HOME: root, AGENT_INBOX_SQLITE: join(root, "missing-sqlite") };
  const payload = JSON.stringify({ type: "agent-turn-complete", "thread-id": "t", "last-assistant-message": "done" });
  const result = spawnSync(
    process.execPath,
    [CLI, "hook", "codex-notify", "--then", process.execPath, helper, capture, "space and 'quote'", payload],
    {
      env,
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.equal(result.status, 0);
  const deadline = Date.now() + 3000;
  while (!existsSync(capture) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(JSON.parse(readFileSync(capture, "utf8")), ["space and 'quote'", payload]);
});
