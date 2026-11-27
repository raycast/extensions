require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reconnectedConversation, applyAssistantMessage, messagesFromThread, parseLibrary, upsertConversation, transcript } = require("../src/conversations.ts");

test("replacement for an unavailable thread keeps its draft accessible after persistence", () => {
  const saved = { threadId: "deleted", messages: [{ id: "u", role: "user", content: "old question" }], draft: "unsent question", title: "old title" };
  const replacement = reconnectedConversation(saved, "replacement", [], "/project");
  let library = upsertConversation(parseLibrary(), saved);
  library = upsertConversation(library, replacement);
  const restored = parseLibrary(JSON.stringify(library));
  assert.equal(restored.activeId, "replacement");
  assert.equal(restored.sessions.find(s => s.threadId === restored.activeId).draft, "unsent question");
  assert.equal(restored.sessions.find(s => s.threadId === "deleted").messages[0].content, "old question");
  assert.equal(replacement.title, undefined);
  assert.equal(saved.threadId, "deleted");
});

test("reconnection preserves text edited while connecting, including an intentionally empty draft", () => {
  const saved = { threadId: "old", messages: [], draft: "stale" };
  assert.equal(reconnectedConversation(saved, "new", [], "", "edited now").draft, "edited now");
  assert.equal(reconnectedConversation(saved, "new", [], "", "").draft, "");
});

test("a resumed partial answer receives deltas and completion without duplicate messages", () => {
  let messages = messagesFromThread({ turns: [{ status: "inProgress", items: [{ type: "agentMessage", id: "server-item", text: "Hello" }] }] });
  messages = applyAssistantMessage(messages, { itemId: "server-item", placeholderId: null, text: " world", completed: false });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content, "Hello world");
  messages = applyAssistantMessage(messages, { itemId: "server-item", placeholderId: null, text: "Hello world!", completed: true });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].status, "complete");
  assert.equal((transcript(messages).match(/Hello world!/g) || []).length, 1);
});

test("local placeholder retains identity and server mapping across a saved-history resume", () => {
  let messages = [{ id: "local-placeholder", role: "assistant", content: "", status: "streaming" }];
  messages = applyAssistantMessage(messages, { itemId: "server-item", placeholderId: "local-placeholder", text: "First", completed: false });
  const library = parseLibrary(JSON.stringify(upsertConversation(parseLibrary(), { threadId: "t", messages })));
  messages = applyAssistantMessage(library.sessions[0].messages, { itemId: "server-item", placeholderId: null, text: " rest", completed: false });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, "local-placeholder");
  assert.equal(messages[0].itemId, "server-item");
  assert.equal(messages[0].content, "First rest");
});

test("distinct assistant items stay separate and empty completion retains streamed text", () => {
  const original = [{ id: "user", role: "user", content: "question" }];
  let messages = applyAssistantMessage(original, { itemId: "a", placeholderId: null, text: "commentary", completed: true });
  messages = applyAssistantMessage(messages, { itemId: "b", placeholderId: null, text: "answer", completed: false });
  messages = applyAssistantMessage(messages, { itemId: "b", placeholderId: null, text: "", completed: true });
  assert.equal(messages.length, 3);
  assert.equal(messages[1].content, "commentary");
  assert.equal(messages[2].content, "answer");
  assert.equal(original.length, 1);
});
