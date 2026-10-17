require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown } = require("../src/markdown.ts");
const { conversationMarkdown } = require("../src/chat-text.ts");

test("ordinary line breaks remain visible and paragraph breaks are preserved", () => {
  assert.equal(renderMarkdown("第一行\n第二行\n\n新段落"), "第一行  \n第二行\n\n新段落");
  assert.equal(renderMarkdown("first\r\nsecond"), "first  \nsecond");
});

test("headings, emphasis, lists, tables and links retain their Markdown", () => {
  const markdown = "## 标题\n\n**加粗** 和 *斜体*\n\n- 项目一\n- 项目二\n\n| 名称 | 值 |\n| --- | --- |\n| A | 1 |\n\n[链接](https://example.com)";
  assert.equal(renderMarkdown(markdown), markdown);
});

test("code is literal, including math delimiters, indentation and Markdown symbols", () => {
  const markdown = "```python\nvalue = '$x$'\n    return 2 ** 3\n```\n\n代码中的 `$x$` 保持原文";
  assert.equal(renderMarkdown(markdown), markdown);
});

test("math delimiters are adapted outside code while multiline display math stays intact", () => {
  assert.equal(renderMarkdown("公式 $x^2$ 和 \\(y\\)"), "公式 \\(x^2\\) 和 \\(y\\)");
  for (const markdown of ["$$\nx^2\n+ y^2\n$$", "\\[\nx^2\n+ y^2\n\\]", "\\begin{equation}\nx^2\n+ y^2\n\\end{equation}"]) {
    assert.equal(renderMarkdown(markdown), markdown);
  }
  assert.equal(renderMarkdown("价格 $10 和 $20，转义 \\$x\\$"), "价格 $10 和 $20，转义 \\$x\\$");
});

test("unfinished code is closed for display without absorbing other message headers", () => {
  assert.equal(renderMarkdown("```js\nconsole.log(1)"), "```js\nconsole.log(1)\n```");
  assert.equal(renderMarkdown("> ```js\n> console.log(1)"), "> ```js\n> console.log(1)\n> ```");
});

test("long plain prose is separated only at sentence boundaries without losing content", () => {
  const content = "这是一句用于检查完整内容保留的长句。".repeat(30);
  const formatted = renderMarkdown(content);
  assert.ok(formatted.includes("\n\n"));
  assert.equal(formatted.replace(/\n/g, ""), content);
  assert.equal(renderMarkdown("**" + content + "**"), "**" + content + "**");
});

test("the conversation renderer uses real Markdown for all messages, newest first", () => {
  const messages = [
    { id: "1", role: "user", content: "第一行\n第二行" },
    { id: "2", role: "assistant", content: "## 标题\n\n**加粗**\n\n- 项目\n\n$x^2$" },
  ];
  const output = conversationMarkdown(messages, "/assets", "已连接", "");
  assert.match(output, /## 标题\n\n\*\*加粗\*\*\n\n- 项目\n\n\\\(x\^2\\\)/);
  assert.match(output, /第一行  \n第二行/);
  assert.ok(output.indexOf("## 标题") < output.indexOf("第一行"));
  assert.ok(!output.includes("```text"));
  assert.equal(messages[0].content, "第一行\n第二行");
});
