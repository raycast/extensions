import assert from "node:assert/strict";
import { test } from "node:test";
import { supports } from "pele";
import { MAX_SOURCE_LENGTH, normalizeSource, readInput } from "../src/lib/input";

test("accepts plain source, BOM, Windows line endings, and Markdown Mermaid fences", () => {
  const source = "flowchart LR\n A --> B";
  assert.equal(normalizeSource(`\uFEFF  ${source.replace(/\n/g, "\r\n")}  `), source);
  assert.equal(normalizeSource(`Here is a diagram:\n\n\`\`\`mermaid\n${source}\n\`\`\`\n\nSome notes.`), source);
  assert.equal(normalizeSource(`~~~mermaid\n${source}\n~~~`), source);
});

test("accepts longer closing fences of the same kind", () => {
  const source = "flowchart LR\n A --> B";
  for (const fence of ["`", "~"]) {
    for (const openingLength of [3, 4]) {
      const input = `Here is a diagram:\n${fence.repeat(openingLength)}mermaid\n${source}\n${fence.repeat(openingLength + 1)}\nSome notes.`;
      assert.equal(normalizeSource(input), source);
    }
  }
});

test("does not close a Mermaid block with a shorter or different fence", () => {
  for (const closing of ["```", "~~~~"]) {
    const source = `flowchart LR\n A --> B\n${closing}\n C --> D`;
    assert.equal(normalizeSource(`\`\`\`\`mermaid\n${source}\n\`\`\`\``), source);
  }
});

test("preserves YAML frontmatter and recognizes configured diagrams inside Markdown fences", () => {
  const source =
    "---\nconfig:\n  sankey:\n    showValues: false\n    nodeWidth: 15\n    nodePadding: 20\n---\nsankey\nA,B,10";
  for (const input of [source, `\`\`\`mermaid\n${source}\n\`\`\``, `~~~mermaid\n${source}\n~~~`]) {
    const normalized = normalizeSource(input.replace(/\n/g, "\r\n"));
    assert.equal(normalized, source);
    assert.ok(supports(normalized), "configured clipboard input opens directly in the preview");
  }
});

test("rejects empty, oversized, or ambiguous multiple diagrams", () => {
  assert.throws(() => normalizeSource("  "), /Enter Mermaid/);
  assert.throws(() => normalizeSource("x".repeat(MAX_SOURCE_LENGTH + 1)), /50,000/);
  assert.throws(
    () => normalizeSource('```mermaid\nflowchart LR\n A-->B\n```\n```mermaid\npie\n"A":1\n```'),
    /one Mermaid/,
  );
});

test("prefers selection and only reads clipboard when selection is unavailable or empty", async () => {
  let clipboardReads = 0;
  const clipboard = async () => {
    clipboardReads++;
    return "clipboard";
  };
  assert.equal(await readInput(async () => "selection", clipboard), "selection");
  assert.equal(clipboardReads, 0);
  assert.equal(await readInput(async () => " \n", clipboard), "clipboard");
  assert.equal(
    await readInput(async () => {
      throw new Error("Not supported");
    }, clipboard),
    "clipboard",
  );
  assert.equal(clipboardReads, 2);
  assert.equal(
    await readInput(
      async () => "",
      async () => undefined,
    ),
    "",
  );
  await assert.rejects(
    () =>
      readInput(
        async () => "",
        async () => {
          throw new Error("Clipboard unavailable");
        },
      ),
    /Clipboard unavailable/,
  );
});
