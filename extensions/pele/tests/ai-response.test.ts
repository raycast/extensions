import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiagramResponse } from "../src/lib/ai-response";
import { renderDiagram } from "../src/lib/render";

const assets = path.join(process.cwd(), "assets");
const options = { theme: "light", scale: 2, transparent: false };

test("links to the actual export without substituting Raycast's Mermaid renderer", async () => {
  const source = "flowchart LR\nEggs --> Tadpole --> Froglet --> Adult --> Eggs";
  const diagram = await renderDiagram(source, options, assets);
  for (const format of ["png", "svg"] as const) {
    const filePath = path.join(process.cwd(), "Saved Diagrams (Pele #1", `frog.${format}`);
    const result = createDiagramResponse(diagram, filePath, format);
    assert.equal(fileURLToPath(result.fileUrl), filePath);
    assert.match(result.fileUrl, /Saved%20Diagrams%20\(Pele%20%231/);
    assert.ok(result.markdown.startsWith(`[Open Pele ${format.toUpperCase()}](<${result.fileUrl}>)`));
    assert.match(result.markdown, /cannot display the local image inline/);
    assert.doesNotMatch(result.markdown, /!\[|sandbox:|```|flowchart/);
    assert.equal(result.width, format === "png" ? diagram.pngWidth : diagram.width);
    assert.equal(result.height, format === "png" ? diagram.pngHeight : diagram.height);
  }
});

test("keeps source config and backticks out of the response Markdown", async () => {
  const source =
    "---\nconfig:\n  flowchart:\n    nodeSpacing: 40\n---\nflowchart LR\nA[Start] --> B[End]\n%% Keep ``` in this comment";
  const diagram = await renderDiagram(source, options, assets);
  const result = createDiagramResponse(diagram, path.join(process.cwd(), "diagram.png"), "png");
  assert.equal(diagram.source, source);
  assert.doesNotMatch(result.markdown, /```|nodeSpacing|flowchart/);
});
