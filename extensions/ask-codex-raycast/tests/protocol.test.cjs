require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CodexAppServer } = require("../src/codex.ts");
const { pathCandidates, expandHome, windowsShellCommand } = require("../src/executable.ts");

function client(events = []) {
  return new CodexAppServer({ sandbox: "read-only", liveSearch: false, onEvent: event => events.push(event) });
}
test("Mac candidates cover Apple Silicon, Intel and user installs", () => {
  const paths = pathCandidates("darwin", "/Users/测试", {});
  assert.ok(paths.includes("/opt/homebrew/bin/codex"));
  assert.ok(paths.includes("/usr/local/bin/codex"));
  assert.ok(paths.includes("/Users/测试/.local/bin/codex"));
});
test("Windows candidates preserve spaces and non-ASCII names", () => {
  const paths = pathCandidates("win32", "C:\\Users\\测试 User", { APPDATA: "C:\\Users\\测试 User\\AppData\\Roaming" });
  assert.ok(paths.includes("C:\\Users\\测试 User\\AppData\\Roaming\\npm\\codex.cmd"));
  assert.equal(windowsShellCommand(paths[0]), `"${paths[0]}"`);
  assert.throws(() => windowsShellCommand("C:\\bad%NAME%\\codex.cmd"));
});
test("home expansion does not rewrite named-user tilde paths", () => {
  assert.equal(expandHome("~someone/file", "/Users/a"), "~someone/file");
  assert.equal(expandHome("~", "/Users/a"), "/Users/a");
});
test("foreign-thread events do not reset an active turn", () => {
  const events = [];
  const c = client(events);
  c.threadId = "mine";
  c.activeTurnId = "turn1";
  c.handleLine(JSON.stringify({ method: "turn/completed", params: { threadId: "other", turn: { id: "turn2" } } }));
  assert.equal(c.currentTurnId, "turn1");
  assert.equal(events.length, 0);
});
test("completion before start acknowledgement cannot revive an ended turn", async () => {
  const c = client();
  c.threadId = "mine";
  c.request = async () => {
    c.handleLine(JSON.stringify({ method: "turn/completed", params: { threadId: "mine", turn: { id: "t" } } }));
    return { turn: { id: "t" } };
  };
  await c.startTurn("hello");
  assert.equal(c.currentTurnId, null);
});
test("resume preserves original cwd and never elevates sandbox", async () => {
  const c = client();
  let params;
  c.request = async (method, supplied) => { params = supplied; return { thread: { id: "old", cwd: "/original", turns: [] } }; };
  await c.resumeThread("old");
  assert.equal(params.cwd, undefined);
  assert.equal(params.sandbox, "read-only");
  assert.equal(c.threadSnapshot.cwd, "/original");
});
test("listing uses explicit app-server source and supports cursor/search", async () => {
  const c = client();
  let params;
  c.request = async (method, supplied) => { params = supplied; return { data: [{ id: "a" }], nextCursor: "next" }; };
  const result = await c.listThreads("cursor", "hello");
  assert.ok(params.sourceKinds.includes("appServer"));
  assert.equal(params.searchTerm, "hello");
  assert.equal(params.cursor, "cursor");
  assert.equal(result.nextCursor, "next");
});
test("server requests get explicit rejection, never implicit approval", () => {
  const c = client();
  let response;
  c.write = message => { response = message; };
  c.handleLine(JSON.stringify({ id: "permission1", method: "item/commandExecution/requestApproval", params: {} }));
  assert.equal(response.id, "permission1");
  assert.equal(response.error.code, -32601);
});
