import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { PNG } from "pngjs";
import { DOMParser } from "@xmldom/xmldom";
import { render } from "pele";
import { renderDiagram } from "../src/lib/render";
import { prepareSvg } from "../src/lib/svg";
import { EXAMPLES } from "../src/lib/examples";
import { resolveTheme, THEMES } from "../src/lib/themes";

const assets = path.join(process.cwd(), "assets");
const options = { theme: "light", scale: 2, transparent: false };
const flowchart = "flowchart LR\n A[Start] --> B[End]";
const sankeyBody = `sankey

Electricity grid,Heating and cooling - homes,113.726
Electricity grid,Industry,342.165
Electricity grid,Losses,56.691`;
const sankey = `---
config:
  sankey:
    showValues: false
    nodeWidth: 15
    nodePadding: 20
---
${sankeyBody}`;

test("applies Sankey frontmatter values and geometry", () => {
  const svg = render(sankey).svg;
  assert.doesNotMatch(svg, /pele-sankey-value/);
  assert.match(render(sankeyBody).svg, /pele-sankey-value/);
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const nodes = Array.from(document.getElementsByTagName("rect")).filter(
    (element) => element.getAttribute("class") === "pele-sankey-node",
  );
  assert.equal(nodes.length, 4);
  assert.ok(nodes.every((node) => node.getAttribute("width") === "15"));
  const targets = nodes.slice(1);
  for (let i = 1; i < targets.length; i++) {
    const previousBottom = Number(targets[i - 1].getAttribute("y")) + Number(targets[i - 1].getAttribute("height"));
    assert.ok(Math.abs(Number(targets[i].getAttribute("y")) - previousBottom - 20) < 0.02);
  }
});

test("preserves config through PNG and SVG exports, Markdown input, and init directives", async () => {
  const diagram = await renderDiagram(`\`\`\`mermaid\n${sankey}\n\`\`\``, options, assets);
  assert.equal(diagram.source, sankey);
  assert.equal(diagram.type, "sankey");
  assert.equal(PNG.sync.read(diagram.png).width, diagram.pngWidth);
  for (const [before, after] of [
    ["showValues: false", "showValues: true"],
    ["nodeWidth: 15", "nodeWidth: 30"],
    ["nodePadding: 20", "nodePadding: 40"],
  ]) {
    const changed = await renderDiagram(sankey.replace(before, after), options, assets);
    assert.notEqual(changed.svg, diagram.svg, `${before} changes the exported SVG`);
    assert.ok(!changed.png.equals(diagram.png), `${before} changes the exported PNG`);
  }
  const directive = await renderDiagram(
    `%%{init: {"sankey":{"showValues":false,"nodeWidth":15,"nodePadding":20}}}%%\n${sankeyBody}`,
    options,
    assets,
  );
  assert.equal(directive.svg, diagram.svg);
  assert.deepEqual(directive.png, diagram.png);
});

test("renders every built-in example with visible content and portable SVG text outlines", async () => {
  for (const example of EXAMPLES) {
    const diagram = await renderDiagram(example.source, options, assets);
    const png = PNG.sync.read(diagram.png);
    assert.equal(png.width, diagram.pngWidth);
    assert.equal(png.height, diagram.pngHeight);
    assert.equal(png.width, diagram.width * 2);
    assert.equal(png.height, diagram.height * 2);
    assert.ok(
      png.data.some((channel, index) => index % 4 !== 3 && channel < 100),
      `${example.title} has visible ink`,
    );
    assert.match(diagram.svg, /<path/);
    assert.doesNotMatch(diagram.svg, /<text[\s>]|var\(|<image[\s>]|<script[\s>]/);
    assert.match(diagram.svg, new RegExp(`width="${diagram.width}"`));
  }
});

test("renders emoji as real portable outlines instead of missing-glyph boxes", async () => {
  for (const label of ["🥚", "🐟", "🐸", "👩🏽‍💻", "🇮🇳"]) {
    const diagram = await renderDiagram(`flowchart LR\nA["${label}"]`, options, assets);
    const document = new DOMParser().parseFromString(diagram.svg, "image/svg+xml");
    const paths = Array.from(document.getElementsByTagName("path"));
    assert.ok(
      paths.some((element) => (element.getAttribute("d")?.match(/[MLCQZ]/g)?.length ?? 0) > 50),
      `${label} has a detailed glyph outline, not a missing-glyph rectangle`,
    );
    assert.doesNotMatch(diagram.svg, /<text[\s>]|<image[\s>]/);
    assert.ok(PNG.sync.read(diagram.png).data.some((channel, index) => index % 4 !== 3 && channel < 100));
  }
});

test("uses theme colors and preserves transparency and custom diagram styles", async () => {
  for (const theme of THEMES) {
    const diagram = await renderDiagram(flowchart, { ...options, theme: theme.id }, assets);
    const png = PNG.sync.read(diagram.png);
    const rgb = theme.colors.bg
      .slice(1)
      .match(/../g)
      ?.map((hex) => parseInt(hex, 16));
    assert.deepEqual([...png.data.subarray(0, 4)], [...(rgb ?? []), 255]);
  }
  const transparent = await renderDiagram(flowchart, { ...options, transparent: true }, assets);
  assert.equal(PNG.sync.read(transparent.png).data[3], 0);
  const styled = await renderDiagram(`${flowchart}\nstyle A fill:#ff0000\nlinkStyle 0 stroke:#ff0000`, options, assets);
  const png = PNG.sync.read(styled.png);
  let redPixels = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 0) redPixels++;
  }
  assert.ok(redPixels > 100, "explicit source styles survive theming and rasterization");
});

test("resolves nested CSS fallbacks without rewriting diagram labels", () => {
  const raw = render('flowchart LR\n A["var(--pele-bg)"] --> B[OK]', { responsive: false }).svg;
  const svg = prepareSvg(raw, "dark", false);
  assert.match(svg, />var\(--pele-bg\)<\/text>/);
  assert.doesNotMatch(svg, /="var\(/);
  assert.match(svg, /rx="4px"/);
  assert.doesNotMatch(svg, /style="rx:/);
  const nested =
    '<svg xmlns="http://www.w3.org/2000/svg" style="--local:var(--missing, var(--pele-fg));color:var(--local)"><rect fill="var(--missing, rgb(1, 2, 3))"/></svg>';
  assert.match(prepareSvg(nested, "dark", true), /color:#f4f4f5/);
  assert.match(prepareSvg(nested, "dark", true), /fill="rgb\(1, 2, 3\)"/);
});

test("handles invalid input and never emits active links or remote images", async () => {
  await assert.rejects(() => renderDiagram("not a diagram", options, assets));
  await assert.rejects(() => renderDiagram("flowchart LR\n A[", options, assets));
  await assert.rejects(() => renderDiagram(flowchart, { ...options, scale: 0 }, assets), /scale/);
  await assert.rejects(() => renderDiagram(flowchart, { ...options, theme: "missing" }, assets), /theme/);
  const linked = await renderDiagram(`${flowchart}\nclick A "https://example.com/private"`, options, assets);
  assert.doesNotMatch(linked.svg, /https:\/\/example.com|<a[\s>]/);
});

test("caps large PNGs while preserving vector dimensions and source direction", async () => {
  const source = `flowchart LR\n${Array.from({ length: 80 }, (_, i) => `N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join("\n")}`;
  const diagram = await renderDiagram(source, { ...options, scale: 4 }, assets);
  assert.ok(diagram.width > diagram.height);
  assert.ok(diagram.width > 8192);
  assert.ok(diagram.pngWidth <= 8192 && diagram.pngHeight <= 8192);
  assert.ok(diagram.pngWidth * diagram.pngHeight <= 16_000_000);
  assert.match(diagram.svg, new RegExp(`width="${diagram.width}"`));
});

test("matches Raycast appearance only for the automatic theme", () => {
  assert.equal(resolveTheme("auto", "dark"), "dark");
  assert.equal(resolveTheme("auto", "light"), "light");
  assert.equal(resolveTheme("flexoki-light", "dark"), "flexoki-light");
});
