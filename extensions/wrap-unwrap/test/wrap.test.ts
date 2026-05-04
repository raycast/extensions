import { test } from "node:test";
import assert from "node:assert/strict";
import { wrap } from "../src/lib/wrap.js";

const W = (n: number) => ({ width: n });

test("wrap returns short input unchanged", () => {
  assert.equal(wrap("short", W(80)), "short");
});

test("wrap respects column budget on plain prose", () => {
  const input =
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
  const out = wrap(input, W(20));
  for (const line of out.split("\n")) {
    assert.ok(
      line.length <= 20,
      `line too long: ${line.length} chars: ${JSON.stringify(line)}`,
    );
  }
  // round trip: joining lines with a space gives back the input
  assert.equal(out.split("\n").join(" "), input);
});

test("wrap leaves fenced code untouched even when long", () => {
  const longCode =
    "this_is_a_very_long_line_inside_a_code_fence_that_should_not_be_wrapped";
  const input = "```\n" + longCode + "\n```";
  const out = wrap(input, W(40));
  assert.ok(out.includes(longCode));
});

test("wrap preserves headings on their own line", () => {
  const input = "# A short heading\nbody text here";
  const out = wrap(input, W(40));
  assert.equal(out.split("\n")[0], "# A short heading");
});

test("wrap respects width INCLUDING blockquote prefix", () => {
  const input = "> alpha beta gamma delta epsilon zeta eta";
  const out = wrap(input, W(20));
  for (const line of out.split("\n")) {
    assert.ok(line.length <= 20, `line too long: ${JSON.stringify(line)}`);
    assert.ok(line.startsWith("> "), `lost quote prefix: ${JSON.stringify(line)}`);
  }
});

test("wrap respects width INCLUDING list marker + hang", () => {
  const input = "- alpha beta gamma delta epsilon zeta eta theta";
  const out = wrap(input, W(20));
  const lines = out.split("\n");
  for (const line of lines) {
    assert.ok(line.length <= 20, `line too long: ${JSON.stringify(line)}`);
  }
  // First line starts with "- "; continuations indent 2 spaces.
  assert.ok(lines[0].startsWith("- "));
  for (let i = 1; i < lines.length; i++) {
    assert.ok(
      lines[i].startsWith("  "),
      `continuation lacks hang: ${JSON.stringify(lines[i])}`,
    );
  }
});

test("wrap never breaks inside an inline code span", () => {
  const input = "use `inline_code_with_underscores` for stuff";
  const out = wrap(input, W(20));
  // The full code span must survive on a single line, even if it pushes the line over budget.
  assert.ok(out.includes("`inline_code_with_underscores`"));
});

test("wrap never breaks inside an inline link", () => {
  const input = "see [the docs](https://example.com/very/long/path) please";
  const out = wrap(input, W(20));
  assert.ok(out.includes("[the docs](https://example.com/very/long/path)"));
});

test("wrap with width<20 clamps to 20", () => {
  const input =
    "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
  const out = wrap(input, { width: 5 });
  for (const line of out.split("\n")) {
    assert.ok(line.length <= 20, `line too long: ${line.length}`);
  }
});

test("wrap emits oversized token alone (no mid-word break)", () => {
  const tok = "supercalifragilisticexpialidocious";
  const input = `before ${tok} after`;
  const out = wrap(input, W(20));
  // The token line will be > 20; this is acceptable.
  assert.ok(out.includes(tok));
  for (const line of out.split("\n")) {
    if (!line.includes(tok)) {
      assert.ok(
        line.length <= 20,
        `non-oversized line too long: ${JSON.stringify(line)}`,
      );
    }
  }
});

test("wrap handles empty input", () => {
  assert.equal(wrap("", W(80)), "");
});

test("wrap preserves trailing-space hard break", () => {
  // Two trailing spaces are CommonMark's <br>; tokenize strips them, so the
  // wrap path has to re-append the marker after fill.
  const input = "line one  \nline two";
  const out = wrap(input, W(80));
  const lines = out.split("\n");
  assert.equal(lines[0], "line one  ");
  assert.equal(lines[1], "line two");
});

test("wrap preserves backslash hard break", () => {
  const input = "line one\\\nline two";
  const out = wrap(input, W(80));
  const lines = out.split("\n");
  assert.equal(lines[0], "line one\\");
  assert.equal(lines[1], "line two");
});

test("wrap places hard-break marker on last filled line", () => {
  // When the hard-break-terminated paragraph wraps across multiple lines,
  // the marker lands on the LAST emitted line, not the original.
  const input = "alpha beta gamma delta epsilon  ";
  const out = wrap(input, W(20));
  const lines = out.split("\n");
  // Greedy: "alpha beta gamma" (16), overflow "delta" → "delta epsilon" → "delta epsilon  ".
  assert.equal(lines[lines.length - 1], "delta epsilon  ");
});
