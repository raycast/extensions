require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { renderMarkdown, stripMessageDividers } = require("../src/markdown.ts");
const { conversationMarkdown } = require("../src/chat-text.ts");

test("display filtering removes standalone thematic and HTML rules without joining prose or mutating the source", () => {
  for (const rule of [
    "---",
    "***",
    "___",
    "- - -",
    "* * *",
    "_ _ _",
    "  -\t- - ",
    "<hr>",
    "<HR />",
    '<hr class="section">',
  ]) {
    const source = `First paragraph\r\n\r\n${rule}\r\n\r\nNext paragraph`;
    const output = stripMessageDividers(source);
    assert.equal(output, "First paragraph\r\n\r\n\r\n\r\nNext paragraph");
    assert.equal(
      source,
      `First paragraph\r\n\r\n${rule}\r\n\r\nNext paragraph`,
    );
    assert.equal(stripMessageDividers(output), output);
  }
  assert.equal(
    stripMessageDividers("before --- after\n<hr> inline text\n\\---\n-*_"),
    "before --- after\n<hr> inline text\n\\---\n-*_",
  );
});

test("divider filtering preserves Setext headings and quoted heading scope", () => {
  for (const source of [
    "Title\n---",
    "Title\n------\n\nBody",
    "Title\n===",
    "> Title\n> ---",
    "Multi-line\nheading\n---",
  ])
    assert.equal(stripMessageDividers(source), source);
  assert.equal(stripMessageDividers("Title\n\n---\nBody"), "Title\n\n\nBody");
  assert.equal(stripMessageDividers("# Heading\n---"), "# Heading\n");
  assert.equal(
    stripMessageDividers("Outside paragraph\n> ---\n\n> Next quote"),
    "Outside paragraph\n> \n\n> Next quote",
  );
});

test("divider filtering preserves fenced YAML, longer fences, quoted fences and unfinished code", () => {
  for (const source of [
    "```yaml\n---\nkey: value\n***\n___\n<hr>\n```",
    "~~~~yaml\n---\n~~~\n___\n~~~~",
    "> ```yaml\n> ---\n> key: value\n> <hr>\n> ```",
    "> > ~~~\n> > * * *\n> > ~~~",
    "- ```yaml\n  ---\n  key: value\n  ```",
    "```text\n- ```\n---\n***\n```",
    "```yaml\n---\nkey: value",
  ])
    assert.equal(stripMessageDividers(source), source);
  assert.equal(
    stripMessageDividers("```yaml\n---\n```\n\n***\n\nAfter"),
    "```yaml\n---\n```\n\n\n\nAfter",
  );
});

test("divider filtering leaves indented code and display math untouched", () => {
  for (const source of [
    "    ---\n    ***\n    <hr>",
    "\t---\n\t___",
    ">     ---\n>     <hr>",
    "$$\n---\n___\n$$",
    "\\[\n---\n***\n\\]",
    "\\begin{align*}\n---\n<hr>\n\\end{align*}",
    "> $$\n> ---\n> $$",
    "$$\n---\nunfinished",
  ])
    assert.equal(stripMessageDividers(source), source);
  assert.equal(
    stripMessageDividers("$$x$$\n\n---\n\nAfter"),
    "$$x$$\n\n\n\nAfter",
  );
});

test("ordinary line breaks remain visible and paragraph breaks are preserved", () => {
  assert.equal(
    renderMarkdown("第一行\n第二行\n\n新段落"),
    "第一行  \n第二行\n\n新段落",
  );
  assert.equal(renderMarkdown("first\r\nsecond"), "first  \nsecond");
});

test("headings, emphasis, lists, tables and links retain their Markdown", () => {
  const markdown =
    "## 标题\n\n**加粗** 和 *斜体*\n\n- 项目一\n- 项目二\n\n| 名称 | 值 |\n| --- | --- |\n| A | 1 |\n\n[链接](https://example.com)";
  assert.equal(renderMarkdown(markdown), markdown);
});

test("code is literal, including math delimiters, indentation and Markdown symbols", () => {
  const markdown =
    "```python\nvalue = '$x$'\n    return 2 ** 3\n```\n\n代码中的 `$x$` 保持原文";
  assert.equal(renderMarkdown(markdown), markdown);
});

test("math delimiters are adapted outside code while multiline display math stays intact", () => {
  assert.equal(
    renderMarkdown("公式 $x^2$ 和 \\(y\\)"),
    "公式 \\(x^2\\) 和 \\(y\\)",
  );
  for (const markdown of [
    "$$\nx^2\n+ y^2\n$$",
    "\\[\nx^2\n+ y^2\n\\]",
    "\\begin{equation}\nx^2\n+ y^2\n\\end{equation}",
  ]) {
    assert.equal(renderMarkdown(markdown), markdown);
  }
  assert.equal(
    renderMarkdown("价格 $10 和 $20，转义 \\$x\\$"),
    "价格 $10 和 $20，转义 \\$x\\$",
  );
});

test("unfinished code is closed for display without absorbing other message headers", () => {
  assert.equal(
    renderMarkdown("```js\nconsole.log(1)"),
    "```js\nconsole.log(1)\n```",
  );
  assert.equal(
    renderMarkdown("> ```js\n> console.log(1)"),
    "> ```js\n> console.log(1)\n> ```",
  );
});

test("long plain prose is separated only at sentence boundaries without losing content", () => {
  const content = "这是一句用于检查完整内容保留的长句。".repeat(30);
  const formatted = renderMarkdown(content);
  assert.ok(formatted.includes("\n\n"));
  assert.equal(formatted.replace(/\n/g, ""), content);
  assert.equal(renderMarkdown("**" + content + "**"), "**" + content + "**");
});

test("the conversation renderer preserves Markdown with questions before answers", () => {
  const messages = [
    { id: "1", role: "user", content: "第一行\n第二行" },
    {
      id: "2",
      role: "assistant",
      content: "## 标题\n\n**加粗**\n\n- 项目\n\n$x^2$",
    },
  ];
  const output = conversationMarkdown(messages, "/assets", "已连接", "");
  assert.match(output, /## 标题\n\n\*\*加粗\*\*\n\n- 项目\n\n\\\(x\^2\\\)/);
  assert.match(output, /> 第一行  \n> 第二行/);
  assert.ok(output.indexOf("第一行") < output.indexOf("## 标题"));
  assert.ok(!output.includes("```text"));
  assert.equal(messages[0].content, "第一行\n第二行");
});

test("multiple exchanges preserve full code, tables, math and Unicode without list-row conversion", () => {
  const code = "```ts\nconst family = '👨‍👩‍👧‍👦';\n    return '$literal$';\n```";
  const table = "| Name | Value |\n| --- | --- |\n| Test | 42 |";
  const output = conversationMarkdown(
    [
      { id: "u1", role: "user", content: "Earlier question" },
      { id: "a1", role: "assistant", content: code },
      { id: "u2", role: "user", content: "Latest question" },
      { id: "a2", role: "assistant", content: table + "\n\n$$\nx^2 + y^2\n$$" },
    ],
    "/assets",
    "",
    "",
  );
  assert.ok(output.includes(code));
  assert.ok(output.includes(table));
  assert.ok(output.includes("$$\nx^2 + y^2\n$$"));
  assert.ok(output.indexOf("Latest question") < output.indexOf(table));
  assert.ok(output.indexOf(table) < output.indexOf("Earlier question"));
  assert.ok(output.indexOf("Earlier question") < output.indexOf(code));
});
