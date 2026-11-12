// Checks the parser against pages saved from explainshell.com on 2026-11-12.
// Run with: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { commandSvg, detailMarkdown, parseExplainPage, plainHelp, repairBold } from "../src/parse.ts";

const page = (name: string) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8");
const PIPELINE = 'cut -d " " -f 1 access.log | sort | uniq -c > out.txt 2>&1 && echo $(date +%s)';
// Stand-in for Raycast's colors: each token is "colored" with the name of its group.
const colorOf = (t: { group: string }) => t.group;

test("splits combined flags and attaches help to each", () => {
  const result = parseExplainPage(page("tar"), "tar xzvf archive.tar.gz");
  assert.ok("tokens" in result);
  assert.deepEqual(
    result.tokens.map((t) => t.text),
    ["tar(1)", "x", "z", "v", "f archive.tar.gz"],
  );
  assert.equal(result.tokens[0].isCommand, true);
  assert.equal(result.tokens[0].help, "an archiving utility");
  // The converter escapes leading dashes, which Markdown renders as plain dashes.
  assert.equal(
    result.tokens[2].help,
    "**\\-z**, **\\--gzip**, **\\--gunzip**, **\\--ungzip**\n\nFilter the archive through **gzip**(1).",
  );
});

test("handles pipes, redirects, quotes and command substitution", () => {
  const result = parseExplainPage(page("pipe"), PIPELINE);
  assert.ok("tokens" in result);
  const texts = result.tokens.map((t) => t.text);
  assert.deepEqual(texts, [
    "cut(1posix)",
    '-d " "',
    "-f 1",
    "access.log",
    "|",
    "sort(1)",
    "|",
    "uniq(1)",
    "-c",
    "> out.txt 2>&1",
    "&&",
    "echo(1plan9)",
    "$(date +%s)",
  ]);
  assert.ok(result.tokens.every((t) => t.help));
  assert.equal(result.tokens[4].help, result.tokens[6].help);
  // "<" is escaped so Markdown does not read <placeholders> as HTML tags.
  assert.match(result.tokens[9].help ?? "", /except >&- and \\<&-/);
  // The page has an invisible character inside a bold run here; it must not survive. The run sits
  // in a quote, which now carries plain text.
  assert.match(result.tokens[9].help ?? "", /\n> \/dev\/fd\/fd\n/);
  assert.ok(!(result.tokens[9].help ?? "").includes("\u200c"), "a zero-width non-joiner survived");
  // The site marks indented examples as <blockquote>; Raycast prints those without parsing inline
  // Markdown, so the quote keeps its indent and carries plain text instead of markers.
  assert.match(result.tokens[4].help ?? "", /\n> \[time \[-p\]\] \[ ! \] command1 \[ \[/);
  const quoteLines = (help: string | undefined) => (help ?? "").split("\n").filter((line) => line.startsWith("> "));
  assert.ok(
    result.tokens.every((t) => quoteLines(t.help).every((line) => !line.includes("\\") && !line.includes("**"))),
    "a marker survived in a quote",
  );
});

test("locates each token in the command and groups it by program", () => {
  const result = parseExplainPage(page("pipe"), PIPELINE);
  assert.ok("tokens" in result);
  // Every token's range points back at its own text; a program's "(1)" suffix is not typed.
  for (const token of result.tokens) {
    assert.ok(token.range, `no range for ${token.text}`);
    assert.equal(PIPELINE.slice(...token.range), token.isCommand ? token.text.replace(/\(\w+\)$/, "") : token.text);
  }
  // The two pipes are found at different places, not the same one twice.
  assert.deepEqual(
    [result.tokens[4].range, result.tokens[6].range],
    [
      [27, 28],
      [34, 35],
    ],
  );
  assert.equal(
    result.tokens.map((t) => t.group.replace("command", "")).join(" "),
    "0 0 0 0 shell 1 shell 2 2 shell shell 3 3",
  );
});

test("puts the picture first and turns the flag line into a heading", () => {
  const result = parseExplainPage(page("tar"), "tar xzvf archive.tar.gz");
  assert.ok("tokens" in result);
  const [image, ...help] = detailMarkdown(result.command, result.tokens, result.tokens[2], colorOf).split("\n\n");
  // The image is the picture for this token, embedded as base64.
  const embedded = image.match(/^!\[\]\(data:image\/svg\+xml;base64,(.+)\)$/)?.[1] ?? "";
  assert.equal(
    Buffer.from(embedded, "base64").toString(),
    commandSvg(result.command, result.tokens, result.tokens[2], colorOf),
  );
  assert.deepEqual(help, [
    "### **\\-z**, **\\--gzip**, **\\--gunzip**, **\\--ungzip**",
    "Filter the archive through **gzip**(1).",
  ]);
  // Help with a single paragraph (the program's summary) gets no heading.
  assert.match(detailMarkdown(result.command, result.tokens, result.tokens[0], colorOf), /\)\n\nan archiving utility$/);
});

test("draws the command as a picture with one color per token and the marker under the selected one", () => {
  const result = parseExplainPage(page("pipe"), PIPELINE);
  assert.ok("tokens" in result);
  const charWidth = 11.5 * 0.602;
  const at = (column: number) => (16 + column * charWidth).toFixed(1);

  // "-f 1" is at column 11 of the command and fits in the first window.
  const head = commandSvg(PIPELINE, result.tokens, result.tokens[2], colorOf);
  assert.ok(head.includes(`<text x="${at(0)}" y="21" fill="command0">cut</text>`));
  assert.ok(head.includes(`<text x="${at(11)}" y="21" fill="command0">-f 1</text>`));
  assert.ok(head.includes(`<text x="${at(11)}" y="37" fill="command0">^^^^</text>`));
  assert.ok(head.includes(`<text x="${at(34)}" y="21" fill="shell">|</text>`));
  // Quotes and other XML characters are escaped, and the cut end gets an ellipsis.
  assert.ok(head.includes(">-d &#34; &#34;</text>"));
  assert.ok(head.includes(`<text x="${at(56)}" y="21" fill="#808080">…</text>`));
  assert.ok(!head.includes("echo"));

  // The last token slides the window: an ellipsis at column 0, then the command from character 22.
  const tail = commandSvg(PIPELINE, result.tokens, result.tokens[12], colorOf);
  assert.ok(tail.includes(`<text x="${at(0)}" y="21" fill="#808080">…</text>`));
  assert.ok(tail.includes(`<text x="${at(1)}" y="21" fill="command0">.log</text>`));
  assert.ok(tail.includes(`<text x="${at(1 + 67 - 22)}" y="37" fill="command3">^^^^^^^^^^^</text>`));
  assert.ok(tail.includes(`<text x="${at(1 + 44 - 22)}" y="21" fill="shell">&#62; out.txt 2&#62;&#38;1</text>`));
});

test("repairs bold the site left as literal asterisks, and only the unambiguous shapes", () => {
  // In the saved page these two arrive as the literal text "**-d **" and "**-f **".
  const result = parseExplainPage(page("pipe"), PIPELINE);
  assert.ok("tokens" in result);
  assert.match(result.tokens[1].help ?? "", /^\*\*-d\*\* _delim_\n/);
  assert.match(result.tokens[2].help ?? "", /^\*\*-f\*\* _list_\n/);
  assert.match(detailMarkdown(PIPELINE, result.tokens, result.tokens[2], colorOf), /\n### \*\*-f\*\* _list_\n/);
  // Bold glued to a word cannot be written in Markdown, so those markers are dropped; the line
  // sits in a quote, which is plain text.
  assert.match(result.tokens[9].help ?? "", /ls > dirlist 2>&1\n/);
  assert.ok(!result.tokens.some((t) => t.help?.includes("\\*\\*")), "a literal ** survived");

  // Shapes from tar's option list.
  assert.equal(repairBold("\\*\\*--sort=\\*\\*_ORDER_"), "**--sort=**_ORDER_");
  assert.equal(repairBold("\\[\\*\\*=\\*\\*_DIR_\\]"), "\\[**=**_DIR_\\]");
  // Real asterisks stay exactly as they are.
  for (const text of [
    "a/\\*\\*/b/\\*\\*",
    "\\*\\*/foo and \\*\\*/bar",
    "use \\*\\* to match any depth, e.g. src/\\*\\*",
  ]) {
    assert.equal(repairBold(text), text);
  }
});

test("gives the clipboard plain text instead of Markdown", () => {
  const result = parseExplainPage(page("tar"), "tar xzvf archive.tar.gz");
  assert.ok("tokens" in result);
  assert.equal(
    plainHelp(result.tokens[2].help ?? ""),
    "-z, --gzip, --gunzip, --ungzip\n\nFilter the archive through gzip(1).",
  );
  // Real asterisks arrive escaped, so stripping bold markers leaves them alone.
  assert.equal(plainHelp("src/\\*\\*/test"), "src/**/test");
  // Placeholders come back unescaped, italics lose their underscores.
  assert.equal(plainHelp("\\<file\\> and _fd_"), "<file> and fd");
  // A literal pair that looks like italics arrives escaped, so it keeps its underscores.
  assert.equal(plainHelp("\\_\\_STDC\\_\\_"), "__STDC__");
  assert.equal(plainHelp("/\\_foo\\_"), "/_foo_");
});

test("reports a missing man page as an error", () => {
  const result = parseExplainPage(page("missing"), "zzzznotacommand -x");
  assert.deepEqual(result, {
    command: "zzzznotacommand -x",
    error: "missing man page",
    detail: "No man page found for zzzznotacommand.",
  });
});

test("reports a parsing error without the caret drawing", () => {
  const result = parseExplainPage(page("parseerr"), 'echo "unterminated');
  assert.ok("error" in result);
  assert.equal(result.error, "parsing error!");
  assert.equal(result.detail, "unexpected EOF while looking for matching '\"' (position 18)");
});

test("rejects a page that explains a different command", () => {
  const result = parseExplainPage(page("tar"), "ls -la");
  assert.ok("error" in result);
  assert.equal(result.error, "Unexpected response");
});
