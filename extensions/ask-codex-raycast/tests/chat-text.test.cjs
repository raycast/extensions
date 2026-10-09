require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { messageRows, rowTitle } = require("../src/chat-text.ts");

test("wrapped prose retains every character without adding bullets", () => {
  const content = "这是一段比较长的中文回答，需要自动换行，同时保留完整内容。";
  const rows = messageRows(content, 16);
  assert.ok(rows.length > 1);
  assert.equal(rows.join(""), content);
  assert.ok(rows.every((row) => !row.startsWith("●")));
  assert.ok(rows.every((row) => !/^[，。！？]/.test(row)));
});

test("English prose wraps at spaces instead of splitting ordinary words", () => {
  const content = "Continue this conversation without breaking ordinary words across lines.";
  const rows = messageRows(content, 28);
  assert.equal(rows.join(" "), content);
  assert.ok(rows.includes("Continue this conversation"));
});

test("fenced code keeps indentation and literal Markdown characters", () => {
  const content = "### Example\n```python\ndef run():\n    return 2 ** 3\n```\n**Done**";
  assert.deepEqual(messageRows(content), [
    "Example", "def run():", "    return 2 ** 3", "Done",
  ]);
  assert.equal(rowTitle("    return 2 ** 3"), "\u00a0\u00a0\u00a0\u00a0return 2 ** 3");
});

test("streaming code without a closing fence retains its formatting", () => {
  assert.deepEqual(messageRows("```ts\nfunction run() {\n\tconsole.log('hello')"), [
    "function run() {", "    console.log('hello')",
  ]);
});

test("long tokens, Windows newlines and pending replies remain readable", () => {
  const token = "a".repeat(200);
  assert.equal(messageRows(token).join(""), token);
  assert.deepEqual(messageRows("first\r\nsecond"), ["first", "second"]);
  assert.deepEqual(messageRows("  \n"), ["正在思考…"]);
});
