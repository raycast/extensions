import assert from "node:assert/strict";
import { test } from "node:test";
import MarkdownIt from "markdown-it";
import { safeMarkdown } from "./core.js";
import { literal } from "./interaction-format.js";
import { messageMarkdown } from "./message-format.js";

// Compare parsed blocks, not source whitespace: canonical list indentation and fences
// can change without changing the displayed hierarchy or literal code contents.
const blocks = new MarkdownIt("commonmark", { html: false }).disable("reference");
function structure(text: string) {
  return blocks.parse(text, {}).map((token) => ({
    type: token.type === "fence" ? "code_block" : token.type,
    tag: token.tag,
    level: token.level,
    content:
      token.type === "inline"
        ? token.content
            .split("\n")
            .map((line) => line.trim())
            .join("\n")
        : token.content,
  }));
}
// Closing an incomplete fence requires a final newline; all other code whitespace stays exact.
function codeContents(text: string): string[] {
  return blocks
    .parse(text, {})
    .filter((token) => token.type === "fence" || token.type === "code_block")
    .map((token) => token.content.replace(/\n?$/, "\n"));
}
function assertInert(markdown: string) {
  // Use a renderer with HTML enabled to detect accidental exposure after serialization.
  const html = new MarkdownIt({ html: true, linkify: true }).render(markdown);
  assert.doesNotMatch(html, /<(?:a|img|script|iframe|video|audio)\b/i);
}

test("Chinese replies retain headings, lists, emphasis and ordinary text", () => {
  const text = "# 结果\n\n完成了 **安全检查**，保留 *重点*。\n\n- 第一项\n    - 第二项\n\n1. 最后一步";
  assert.deepEqual(structure(messageMarkdown(text)), structure(text));
  assert.equal(messageMarkdown(""), "");
});

test("blank lines do not turn nested list items into literal code", () => {
  const text = "- Parent\n\n    - Child";
  assert.deepEqual(structure(messageMarkdown(text)), structure(text));
});

test("bullet and ordered lists retain nested items and continuation paragraphs across blank lines", () => {
  for (const marker of ["-", "+", "*", "1.", "12)", "123456789."]) {
    const indent = " ".repeat(Math.max(4, marker.length + 1));
    const text = [
      `${marker} Parent`,
      "",
      "",
      `${indent}- Child`,
      "",
      `${indent}  Child continuation`,
      "",
      `${indent}  2) Grandchild`,
      "",
      `${indent}     Grandchild continuation`,
      "",
      `${indent}Parent continuation`,
      "",
      `${indent}1. Sibling`,
    ].join("\n");
    assert.deepEqual(structure(messageMarkdown(text)), structure(text), marker);
  }
  for (const text of [
    "  - Parent\n\n    - Child\n\n      Continuation",
    "1. Parent\n\n\t- Child\n\n\t  Continuation",
    "-\n\n    - Child",
    "-    Parent\n\n     - Child",
    "-\tParent\n\n\t- Child",
    "- Parent\n\n    - Child\n\n  Parent continuation\n\n    - Sibling",
    "- Parent\r\n\r\n    - Child\r\n\r\n      Continuation\r",
  ]) {
    assert.deepEqual(structure(messageMarkdown(text)), structure(text));
  }
});

test("list context ends on dedent and does not come from code bodies or thematic breaks", () => {
  const body = "    <img src='https://evil.test'>\n    https://example.test:8080\n    \\path";
  for (const prefix of [
    "- Parent\n\nOutside",
    "1. Parent\n\n# Outside",
    "   - Parent\n\n   Outside",
    "- - -",
    "* * *",
    "```\n- not a list\n```",
  ]) {
    assert.deepEqual(
      codeContents(messageMarkdown(`${prefix}\n\n${body}`)),
      codeContents(`${prefix}\n\n${body}`),
      prefix,
    );
  }
  // Adjacent indented paragraphs are one code block, including the apparent list marker.
  assert.deepEqual(
    codeContents(messageMarkdown(`    - not a list\n\n${body}`)),
    codeContents(`    - not a list\n\n${body}`),
  );
  // A new ordered item must use its own wider content column, not the previous bullet's.
  assert.deepEqual(
    codeContents(messageMarkdown(`- Parent\n12. Next\n\n  Outside\n\n${body}`)),
    codeContents(`- Parent\n12. Next\n\n  Outside\n\n${body}`),
  );
});

test("nested list prose and tables still make untrusted links and HTML inert", () => {
  const hostile =
    "- Parent\n\n    - ![image](https://evil.test) <img src='https://evil.test'>\n\n      [open](command:run) \\![escaped](https://evil.test) &lt;img>\n\n      | Name | Link |\n      | :--- | ---: |\n      | value | [open](file:///private) |";
  const markdown = messageMarkdown(hostile);
  assertInert(markdown);
  assert.deepEqual(codeContents(markdown), []);
  assert.deepEqual(
    structure(markdown).map(({ type, tag, level }) => ({ type, tag, level })),
    structure(hostile).map(({ type, tag, level }) => ({ type, tag, level })),
  );
  for (const fragment of [
    "&#33;&#91;image&#93;(https&#58;//evil.test)",
    "&lt;img src='https&#58;//evil.test'&gt;",
    "&#91;open&#93;(command&#58;run)",
    "&#92;&#33;&#91;escaped&#93;(https&#58;//evil.test)",
    "&amp;lt;img&gt;",
    "| Name | Link |",
    "| :--- | ---: |",
    "| value | &#91;open&#93;(file&#58;///private) |",
  ])
    assert.ok(markdown.includes(fragment), fragment);
  assert.ok(!markdown.includes("```"));
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
  assert.deepEqual(codeContents(markdown), [
    "https://example.test:8080\n<img src='https://evil.test'>\n\n| a | b |\n| :--- | ---: |\n``` embedded ```\n",
  ]);
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

test("CRLF code normalizes line endings without altering displayed text or backtick runs", () => {
  const body = "https://example.test\r\n<img>\r\n``````\r";
  assert.deepEqual(codeContents(messageMarkdown("~~~~~~~~\r\n" + body + "\n~~~~~~~~\r\n")), [
    "https://example.test\n<img>\n``````\n",
  ]);
});

test("list-contained indented code keeps literal URLs and punctuation", () => {
  const text = '- Example:\n\n      const url = "https://example.test";';
  const markdown = messageMarkdown(text);
  assert.deepEqual(codeContents(markdown), ['const url = "https://example.test";\n']);
  assert.ok(markdown.includes("Example&#58;"));
  assert.equal(blocks.parse(markdown, {})[0]!.type, "bullet_list_open");
});

test("nested prose and actual list code remain distinct across containers", () => {
  const body =
    'const url = "https://example.test:8080";\n  <img src="https://evil.test">\n![image](https://evil.test)\nC:\\path';
  const inputs = [
    "- Parent\n\n    - Child\n\n      Prose: https://example.test",
    "- Parent\n\n    - Child\n\n          " + body.replaceAll("\n", "\n          "),
    "- ```ts\n  " + body.replaceAll("\n", "\n  ") + "\n  ```",
    "- > ```ts\n  > " + body.replaceAll("\n", "\n  > ") + "\n  > ```",
    "> - ```ts\n>   " + body.replaceAll("\n", "\n>   ") + "\n>   ```",
    "- Item\n\n\t  " + body.replaceAll("\n", "\n\t  "),
    "123456789. Item\n\n               " + body.replaceAll("\n", "\n               "),
    "- Item\n\n      " + body.replaceAll("\n", "\n      ") + "\n\n- Sibling",
    "- ~~~~\n  ```\n  " + body.replaceAll("\n", "\n  "),
    "- Parent\n\n    - Child\n\n          ``` not a fence\n          ![image](https://evil.test)",
  ];
  for (const input of inputs) {
    const output = messageMarkdown(input);
    assert.deepEqual(codeContents(output), codeContents(input), input);
    assert.deepEqual(
      structure(output).map(({ type, tag, level }) => ({ type, tag, level })),
      structure(input).map(({ type, tag, level }) => ({ type, tag, level })),
      input,
    );
    assertInert(output);
  }
  assert.deepEqual(codeContents(messageMarkdown(inputs[0]!)), []);
  assert.match(messageMarkdown(inputs[0]!), /Prose&#58; https&#58;/);
});

test("list delimiter changes cannot merge separate source lists", () => {
  for (const input of ["- a\n\n+ b", "1. a\n\n2) b", "- a\n\n* b", "12) a\n\n13) b"]) {
    assert.deepEqual(structure(messageMarkdown(input)), structure(input));
  }
});

test("over-deep blocks preserve the complete source as inert literal text", () => {
  for (const input of [
    "> ".repeat(24) + "tail ![image](https://evil.test)",
    Array.from({ length: 24 }, (_, i) => "  ".repeat(i) + "- item " + i).join("\n") + "\n" + "  ".repeat(24) + "END",
  ]) {
    const output = messageMarkdown(input);
    assert.equal(output, literal(input));
    assert.deepEqual(codeContents(output), [input + "\n"]);
    assertInert(output);
  }
});

test("heading text and multiline setext structure survive serialization", () => {
  for (const input of ["foo #\n---", "foo *a\nb*\n---", "foo #\n===", "# foo #"]) {
    const p = new MarkdownIt("commonmark");
    assert.equal(p.render(messageMarkdown(input)), p.render(input), input);
  }
});

test("leading thematic breaks and empty nested items stay inside lists", () => {
  for (const input of ["- ***", '- ***\n\n      const url = "https://example.test";', "-\n  -\n    -"]) {
    assert.deepEqual(structure(messageMarkdown(input)), structure(input), input);
  }
});

test("single-column tables retain their source even when CommonMark sees a setext heading", () => {
  for (const input of ["| Header |\n---\n| value |", "- Item\n\n  | Header |\n  ---\n  | value |"]) {
    const p = new MarkdownIt({ html: false });
    assert.equal(p.render(messageMarkdown(input)), p.render(input), input);
  }
});

test("ordered list serialization never generates invalid ten-digit markers", () => {
  const input = "999999999. a\n999999999. b";
  assert.deepEqual(structure(messageMarkdown(input)), structure(input));
});

test("adjacent setext-shaped table rows and empty sibling lists keep boundaries", () => {
  for (const input of ["| Header |\n---\n| value |\n---\n| last |", "-\n\n-", "- -\n  -"]) {
    const p = new MarkdownIt({ html: false });
    assert.equal(p.render(messageMarkdown(input)), p.render(input), input);
  }
});
