import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadEngine } from "../src/lib/engine";
import { saveDraft, listDrafts, loadDraft, deleteDraft } from "../src/lib/storage";
import { renderPost } from "../src/lib/renderer";
import { runAITools, type TestClipboard } from "./ai-bundle-probe";

export async function run(root: string, clipboard: TestClipboard) {
  const options = { surface: "web-timeline" as const, theme: "light" as const, width: 390, dpr: 2, expanded: false };
  const start = performance.now();
  const engine = loadEngine(join(root, "assets"));
  const initialized = performance.now();
  const post = { text: "Portable offline preview 👋", author: { name: "Xeet", handle: "xeet" } };
  const preview = await renderPost(post, options);
  const rendered = performance.now();
  assert.equal(preview.report.length.weighted, engine.explain(post, options).length.weighted);
  assert.equal(Buffer.from(await readFile(preview.path)).readUInt32BE(16), 780);
  assert.ok(preview.path.startsWith(root));
  const [one, two] = await Promise.all([saveDraft(post, options), saveDraft({ text: "Second" }, options)]);
  assert.equal((await listDrafts()).length, 2);
  assert.deepEqual((await loadDraft(one.id)).post, post);
  await saveDraft(
    {
      text: "Updated",
      media: [{ kind: "image", width: 780, height: 100, data: (await readFile(preview.path)).toString("base64") }],
    },
    options,
    one.id,
  );
  assert.equal((await listDrafts()).length, 2);
  assert.ok((await loadDraft(one.id)).post.media?.[0].data);
  await deleteDraft(two.id);
  assert.deepEqual(
    (await listDrafts()).map(({ id }) => id),
    [one.id],
  );
  for (let index = 0; index < 51; index++) await saveDraft({ text: `Draft ${index}` }, options);
  assert.equal((await listDrafts()).length, 50);
  assert.equal((await readdir(join(root, "support/drafts"))).length, 50);
  console.log(
    JSON.stringify({
      test: "Relocated production assets and bundled dependencies, offline PNG rendering, draft CRUD, concurrent saves, media persistence, and retention",
      result: "passed",
      coldInitializationMs: +(initialized - start).toFixed(1),
      renderAndWriteMs: +(rendered - initialized).toFixed(1),
    }),
  );
  await runAITools(root, clipboard);
}
