require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseLibrary, upsertConversation, filterSessions, conversationTitle, latestRound, messagesFromThread, transcript } = require("../src/conversations.ts");

const user = (id, content, kind = "message") => ({ id, role: "user", content, kind });
test("migration preserves legacy messages and session ID", () => {
  const previous = { threadId: "old", messages: [user("m1", "你好")] };
  const lib = parseLibrary(undefined, JSON.stringify(previous));
  assert.equal(lib.activeId, "old");
  assert.deepEqual(lib.sessions[0].messages, previous.messages);
  assert.equal(lib.version, 2);
});
test("invalid storage fails closed instead of overwriting history", () => {
  assert.throws(() => parseLibrary("broken"));
  assert.throws(() => parseLibrary('{"version":99,"sessions":[]}'));
});
test("new session preserves previous messages and per-session draft", () => {
  let lib = parseLibrary();
  lib = upsertConversation(lib, { threadId: "a", messages: [user("a1", "之前的问题")], draft: "未发送文字" });
  lib = upsertConversation(lib, { threadId: "b", messages: [] });
  assert.equal(lib.activeId, "b");
  assert.equal(lib.sessions.length, 2);
  assert.equal(lib.sessions[0].draft, "未发送文字");
  assert.equal(lib.sessions[0].messages.length, 1);
});
test("rename and archive don't change active session or delete messages", () => {
  let lib = upsertConversation(parseLibrary(), { threadId: "a", messages: [user("m", "first")] });
  lib = upsertConversation(lib, { threadId: "b", messages: [] });
  lib = upsertConversation(lib, { ...lib.sessions[0], title: "Renamed", archived: true }, false);
  assert.equal(lib.activeId, "b");
  assert.equal(filterSessions(lib.sessions, "", false).length, 1);
  assert.equal(filterSessions(lib.sessions, "first", true)[0].threadId, "a");
  assert.equal(conversationTitle(lib.sessions[0]), "Renamed");
  lib = upsertConversation(lib, { ...lib.sessions[0], archived: false });
  assert.equal(lib.activeId, "a");
  assert.equal(lib.sessions[0].messages.length, 1);
});
test("chat renders only the latest round and retains its steer messages", () => {
  const messages = [user("1", "old"), { id: "2", role: "assistant", content: "old answer" }, user("3", "new"), user("4", "steer", "steer"), { id: "5", role: "assistant", content: "new answer" }];
  const visible = latestRound(messages);
  assert.equal(visible.length, 3);
  assert.doesNotMatch(transcript(visible), /old answer/);
  assert.match(transcript(visible), /补充要求/);
  assert.equal(messages.length, 5);
});
test("server history hydrates text and steering, ignoring tool output", () => {
  const thread = { turns: [{ status: "completed", items: [
    { type: "userMessage", id: "1", content: [{ type: "text", text: "question" }] },
    { type: "commandExecution", id: "2", aggregatedOutput: "secret tool output" },
    { type: "userMessage", id: "3", content: [{ type: "text", text: "steer" }] },
    { type: "agentMessage", id: "4", text: "answer" },
  ] }] };
  const messages = messagesFromThread(thread);
  assert.equal(messages.length, 3);
  assert.equal(messages[1].kind, "steer");
  assert.equal(messages[2].content, "answer");
});
