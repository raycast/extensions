require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { conversationMarkdown } = require("../src/chat-text.ts");

test("conversation preserves avatars and newest-first ordering without mutating history", () => {
  const messages = [{ id: "1", role: "user", content: "Question" }, { id: "2", role: "assistant", content: "**Answer**" }];
  const output = conversationMarkdown(messages, "/my assets", "", "");
  assert.ok(output.indexOf("**Answer**") < output.indexOf("Question"));
  assert.match(output, /command-icon\.png/);
  assert.match(output, /user-avatar\.svg/);
  assert.match(output, /my%20assets/);
  assert.equal(messages[0].content, "Question");
});

test("conversation renders code blocks with their original language and indentation", () => {
  const output = conversationMarkdown([{ id: "1", role: "assistant", content: "### Example\n```python\ndef run():\n    return 2 ** 3\n```" }], "/assets", "", "");
  assert.match(output, /### Example\n```python\ndef run\(\):\n    return 2 \*\* 3\n```/);
});

test("streaming reply retains a thinking placeholder", () => {
  const output = conversationMarkdown([{ id: "1", role: "assistant", content: "", status: "streaming" }], "/assets", "", "");
  assert.match(output, /Codex/);
  assert.match(output, /Thinking…/);
});

test("empty conversation explains the Enter input action", () => {
  const output = conversationMarkdown([], "/assets", "", "");
  assert.match(output, /Codex in Raycast/);
  assert.match(output, /Press Enter to open the message composer/);
});

test("connection errors take precedence over stale status", () => {
  const output = conversationMarkdown([], "/assets", "已连接", "连接失败\n请重试");
  assert.match(output, /^\*\*Connection Notice\*\* · 连接失败 请重试/);
  assert.ok(!output.includes("已连接"));
});
