import assert from "node:assert/strict";
import { test } from "node:test";
import { safeMarkdown } from "./core.js";
import { literal } from "./interaction-format.js";
import { messageMarkdown } from "./message-format.js";

test("Chinese replies retain headings, lists, emphasis and ordinary text", () => {
  const text = "# 结果\n\n完成了 **安全检查**，保留 *重点*。\n\n- 第一项\n    - 第二项\n\n1. 最后一步";
  assert.equal(messageMarkdown(text), text);
  assert.equal(messageMarkdown(""), "");
});

test("pipe tables retain alignment, all wide, empty and extra cells in order", () => {
  const text = [
    "| 项目 | 说明 | 状态 |",
    "| :--- | :---: | ---: |",
    "| 中文 | 内容 | 完成 |",
    "| 很宽的内容".repeat(12) + " | | 额外 | 最后 |",
    "| | | |",
    "| 少量 |",
    "",
    "A | B",
    ":--- | ---:",
    "1 | 2",
  ].join("\n");
  assert.equal(messageMarkdown(text), text);
});

test("escaped and inline-code pipes stay conservative without changing table structure", () => {
  const text = "| Name | Value |\n| --- | --- |\n| a\\|b | `c\\|d` |\n| `x|y` | z |\n| two\\\\| three\\\\\\| |";
  assert.equal(messageMarkdown(text), text);
  assert.equal(
    messageMarkdown("\\![image](https://evil.test) \\<img>"),
    safeMarkdown("\\![image](https://evil.test) \\<img>"),
  );
});

test("malformed and incomplete tables are not rewritten or guessed", () => {
  for (const text of [
    "| header | value |",
    "| A | B |\n| -- | ??? |\n| one | two |",
    "A | B\n---: | :--\none | two",
    "a|b|c",
  ]) {
    assert.equal(messageMarkdown(text), text);
  }
});

test("fenced code bodies keep literal colons, HTML, links, backslashes and table syntax", () => {
  const body =
    'const url = "https://example.test:8080";\n<img src="https://evil.test">\n![image](https://evil.test)\nC:\\path\n| a | b |\n| :--- | ---: |';
  for (const [open, close] of [
    ["```ts", "```"],
    ["~~~~ text", "~~~~~"],
    ["  ```", " ```"],
  ]) {
    const markdown = messageMarkdown(`Before\n\n${open}\n${body}\n${close}\n\n# After`);
    assert.ok(markdown.includes(literal(body)));
    assert.ok(markdown.startsWith("Before\n"));
    assert.ok(markdown.endsWith("# After"));
    assert.ok(!markdown.includes("&#58;"));
    assert.ok(!markdown.includes("&lt;"));
  }
});

test("indented code is kept literal rather than encoded or read as a table", () => {
  const body =
    "    https://example.test:8080\n    <img src='https://evil.test'>\n\n\t| a | b |\n\t| :--- | ---: |\n    ``` embedded ```";
  const markdown = messageMarkdown(`# Code\n\n${body}\n\nAfter`);
  assert.ok(markdown.includes(body));
  assert.ok(!markdown.includes("&#58;"));
  assert.ok(!markdown.includes("&lt;"));
  assert.ok(markdown.endsWith("After"));
});

test("embedded and incomplete fences cannot expose their literal bodies", () => {
  const body = "```\n~~~\n![x](https://evil.test/pixel)\n<img src='https://evil.test'>\n````` not a closer";
  const markdown = messageMarkdown("````text\n" + body + "\n````\n\n![outside](https://evil.test)");
  assert.ok(markdown.includes(literal(body)));
  assert.ok(markdown.endsWith(safeMarkdown("![outside](https://evil.test)")));
  assert.ok(messageMarkdown("~~~~\n" + body).includes(literal(body)));
  assert.equal(
    messageMarkdown("```not`a`fence\n![x](https://evil.test)"),
    safeMarkdown("```not`a`fence\n![x](https://evil.test)"),
  );
});

test("prose and table cells cannot activate links, images, HTML, references or entities", () => {
  const hostile = [
    "![inline](https://evil.test/pixel) ![ref][id] [open](file:///private)",
    "[id]: https://evil.test/pixel",
    "[shortcut] [collapsed][]",
    "<img src='https://evil.test/pixel'> <https://evil.test> <script>bad()</script>",
    "\\![escaped](https://evil.test) &#33;[entity](https://evil.test)",
    "| Header | Value |",
    "| :--- | ---: |",
    "| ![image](https://evil.test/pixel) | [link](command:run) |",
    "| `<img | src='https://evil.test'>` |",
  ].join("\n");
  const markdown = messageMarkdown(hostile);
  assert.equal(
    markdown,
    hostile
      .split("\n")
      .map((line) => (line === "| :--- | ---: |" ? line : safeMarkdown(line)))
      .join("\n"),
  );
  assert.ok(!/[![\]<>\\]/.test(markdown));
  assert.match(markdown, /&amp;#33;/);
});

test("CRLF code contents and longer backtick runs are retained", () => {
  const body = "https://example.test\r\n<img>\r\n``````\r";
  assert.ok(messageMarkdown("~~~~~~~~\r\n" + body + "\n~~~~~~~~\r\n").includes(literal(body)));
});
