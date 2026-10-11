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
  assert.match(output, /ChatGPT/);
  assert.match(output, /正在思考…/);
});

test("empty conversation explains the Enter input action", () => {
  const output = conversationMarkdown([], "/assets", "", "");
  assert.match(output, /开始新对话/);
  assert.match(output, /按 Enter 输入问题/);
});

test("connection errors take precedence over stale status", () => {
  const output = conversationMarkdown([], "/assets", "已连接", "连接失败\n请重试");
  assert.match(output, /^> 连接提示：连接失败 请重试/);
  assert.ok(!output.includes("已连接"));
});
