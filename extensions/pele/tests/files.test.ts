import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, readdir, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanupPreviews, saveDiagram, writeDiagram } from "../src/lib/files";
import { renderDiagram } from "../src/lib/render";

test("writes paired previews, exports without overwriting, and expires only old previews", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pele-test-"));
  try {
    const cache = path.join(root, "previews");
    const exports = path.join(root, "exports with spaces");
    const diagram = await renderDiagram(
      "flowchart LR\n A-->B",
      { theme: "light", scale: 1, transparent: false },
      path.join(process.cwd(), "assets"),
    );
    const first = await writeDiagram(diagram, cache);
    const second = await writeDiagram(diagram, cache);
    assert.notEqual(first.pngPath, second.pngPath);
    assert.equal(await readFile(first.svgPath, "utf8"), diagram.svg);
    assert.deepEqual(await readFile(first.pngPath), diagram.png);
    const saved = await saveDiagram(first.pngPath, exports);
    const savedAgain = await saveDiagram(first.pngPath, exports);
    assert.notEqual(saved, savedAgain);
    assert.deepEqual(await readFile(saved), diagram.png);
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await utimes(path.dirname(first.pngPath), old, old);
    const unrelated = path.join(cache, "keep-me");
    await mkdir(unrelated);
    await utimes(unrelated, old, old);
    await cleanupPreviews(cache);
    const entries = await readdir(cache);
    assert.ok(!entries.includes(path.basename(path.dirname(first.pngPath))));
    assert.ok(entries.includes(path.basename(path.dirname(second.pngPath))));
    assert.ok(entries.includes("keep-me"));
    assert.deepEqual(await readFile(saved), diagram.png);
    await assert.rejects(() => saveDiagram(second.pngPath, "relative/path"), /absolute/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
