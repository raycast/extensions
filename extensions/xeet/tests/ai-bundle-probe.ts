import assert from "node:assert/strict";
import { readFile, readdir, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TestClipboard {
  text: string | undefined;
  reads: number;
  copied: { file: string } | undefined;
  failCopy: boolean;
}

export async function runAITools(root: string, clipboard: TestClipboard) {
  // Invoke the actual compiled Raycast tools, not re-bundled source functions.
  const requireTool = createRequire(join(root, "package.json"));
  const create = (requireTool("./tools/create-post-preview.js") as typeof import("../src/tools/create-post-preview"))
    .default;
  const render = (requireTool("./tools/render-post.js") as typeof import("../src/tools/render-post")).default;
  const inspect = (requireTool("./tools/inspect-post.js") as typeof import("../src/tools/inspect-post")).default;
  const compare = (requireTool("./tools/compare-post-layouts.js") as typeof import("../src/tools/compare-post-layouts"))
    .default;
  const list = (requireTool("./tools/list-drafts.js") as typeof import("../src/tools/list-drafts")).default;
  const save = (requireTool("./tools/save-draft.js") as typeof import("../src/tools/save-draft")).default;
  const remove = requireTool("./tools/delete-draft.js") as typeof import("../src/tools/delete-draft");
  const exportImage = (requireTool("./tools/export-preview.js") as typeof import("../src/tools/export-preview"))
    .default;
  const confirmCreate = (
    requireTool("./tools/create-post-preview.js") as typeof import("../src/tools/create-post-preview")
  ).confirmation;
  const confirmSave = (requireTool("./tools/save-draft.js") as typeof import("../src/tools/save-draft")).confirmation;
  const confirmExport = (requireTool("./tools/export-preview.js") as typeof import("../src/tools/export-preview"))
    .confirmation;
  function json<T>(result: T): T {
    assert.deepEqual(structuredClone(result), result);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
    return result;
  }

  const before = await list({});
  assert.equal(await confirmCreate({ text: "Preview only" }), undefined);
  const createConfirmation = await confirmCreate({ text: "Named post", saveDraft: true });
  assert.match(createConfirmation?.message ?? "", /save.*Saved Drafts/);
  assert.ok(createConfirmation?.info?.some(({ value }) => value === "Named post"));
  const newSaveConfirmation = await confirmSave({ source: { input: "New draft text" } });
  assert.match(newSaveConfirmation?.message ?? "", /Save.*Saved Drafts/);
  assert.ok(newSaveConfirmation?.info?.some(({ value }) => value === "New draft text"));
  assert.deepEqual(await list({}), before, "Confirmations must not write drafts");
  const custom = json(
    await create({
      text: "AI preview 👋",
      author: { name: "Test", handle: "@tester", verified: "business" },
      options: { width: 320, dpr: 1 },
    }),
  );
  assert.equal(custom.draft, null);
  assert.equal(custom.pixelWidth, 320);
  assert.equal(fileURLToPath(custom.fileUrl), custom.pngPath);
  assert.ok(custom.pngPath.startsWith(root));
  for (const action of ["copy", "save"] as const) {
    const confirmation = await confirmExport({ previewId: custom.previewId, action });
    assert.match(confirmation?.message ?? "", action === "copy" ? /Copy.*clipboard/ : /Save.*export directory/);
    assert.ok(confirmation?.info?.some(({ value }) => value === custom.pngPath));
    assert.ok(
      confirmation?.info?.some(({ value }) => value === (action === "copy" ? "Clipboard" : join(root, "exports"))),
    );
  }
  assert.equal(clipboard.copied, undefined, "Export confirmations must not copy the image");
  assert.equal(Buffer.from(await readFile(custom.pngPath)).readUInt32BE(16), 320);
  assert.deepEqual(await list({}), before, "Previewing must not save a draft automatically");
  assert.equal(clipboard.reads, 0);

  const previews = await readdir(join(root, "support/previews"));
  const report = json(await inspect({ source: { input: "a 👋 https://example.com/long/path" } }));
  assert.equal(report.report.length.weighted, 28);
  assert.deepEqual(await readdir(join(root, "support/previews")), previews, "Inspection must not rasterize");
  const longText = "Long post with words. ".repeat(100);
  const collapsed = await inspect({ source: { input: longText } });
  const expanded = await inspect({ source: { input: longText }, options: { expanded: true } });
  assert.ok(collapsed.report.text.hasShowMore);
  assert.equal(expanded.report.text.hasShowMore, false);
  assert.ok(expanded.report.size.height > collapsed.report.size.height);
  await assert.rejects(render({ source: { input: "Hello", clipboard: true } }), /exactly one/);
  await assert.rejects(render({ source: {} }), /exactly one/);
  await assert.rejects(render({ source: { input: "Hello" }, options: { width: 100_000 } }), /Unsupported rendering/);
  await assert.rejects(render({ source: { input: "https://example.com/status/20" } }), /public HTTPS/);
  await assert.rejects(render({ source: { input: '{"text":12}' } }), /string/);
  clipboard.text = undefined;
  await assert.rejects(render({ source: { clipboard: true } }), /No text/);
  clipboard.text = "From clipboard 👋";
  const clipped = json(await render({ source: { clipboard: true } }));
  assert.equal(clipped.report.text.visible, clipboard.text);
  assert.equal(clipboard.reads, 2);

  for (const [dimension, count] of [
    ["theme", 2],
    ["surface", 4],
    ["width", 3],
    ["dpr", 3],
    ["expanded", 2],
  ] as const) {
    const comparison = json(
      await compare({
        source: { input: longText },
        dimension,
        options: { dpr: 1 },
        contactSheet: dimension === "theme",
      }),
    );
    assert.equal(comparison.variants.length, count);
    for (const preview of comparison.variants) {
      const png = await readFile(preview.pngPath);
      assert.equal(png.readUInt32BE(16), preview.pixelWidth);
      assert.equal(png.readUInt32BE(20), preview.pixelHeight);
    }
    if (comparison.contactSheet) {
      assert.equal(comparison.contactSheet.surface, "web-timeline");
      assert.equal(comparison.contactSheet.expanded, false);
      json(await exportImage({ previewId: comparison.contactSheet.previewId, action: "copy" }));
      assert.equal(clipboard.copied?.file, comparison.contactSheet.pngPath);
    }
  }

  const post = {
    text: "AI draft with media",
    author: { name: "Test", handle: "tester" },
    media: [{ kind: "image", width: 320, height: 100, data: (await readFile(custom.pngPath)).toString("base64") }],
  };
  const saved = json(await save({ source: { input: JSON.stringify(post) }, options: { theme: "light", width: 600 } }));
  const repeated = json(
    await save({ source: { input: JSON.stringify(post) }, options: { theme: "light", width: 600 } }),
  );
  assert.equal(saved.draft.id, repeated.draft.id, "Retries must not duplicate a saved draft");
  for (const input of [
    { source: { draftId: saved.draft.id, replacementText: "Changed text" } },
    { source: { input: "Replacement post" }, replaceDraftId: saved.draft.id },
  ]) {
    const confirmation = await confirmSave(input);
    assert.match(confirmation?.message ?? "", /Replace saved draft.*AI draft with media/);
    assert.ok(confirmation?.info?.some(({ value }) => value === saved.draft.id));
  }
  assert.equal((await list({ query: "ai draft with", limit: 5 })).totalCount, 1);
  await assert.rejects(list({ limit: 0 }), /integer/);
  const edited = json(
    await save({
      source: { draftId: saved.draft.id, replacementText: "AI edited draft" },
      options: { expanded: true },
    }),
  );
  assert.equal(edited.draft.id, saved.draft.id);
  const draft = JSON.parse(await readFile(join(root, "support/drafts", `${saved.draft.id}.json`), "utf8"));
  assert.deepEqual(draft.post.media, post.media);
  assert.deepEqual(draft.post.author, post.author);
  assert.equal(draft.options.width, 600);
  const draftPreview = json(await render({ source: { draftId: saved.draft.id } }));
  assert.equal(draftPreview.report.text.visible, "AI edited draft");
  assert.equal(draftPreview.options.theme, "light");
  assert.ok(!JSON.stringify(draftPreview).includes(post.media[0].data), "Tool results must not include image payloads");
  const created = json(
    await create({ text: "AI explicit save", saveDraft: true, author: { avatarPath: custom.pngPath } }),
  );
  assert.ok(created.draft?.id);
  const again = await create({ text: "AI explicit save", saveDraft: true, author: { avatarPath: custom.pngPath } });
  assert.equal(created.draft?.id, again.draft?.id);

  const firstExport = json(await exportImage({ previewId: custom.previewId, action: "save" }));
  const secondExport = json(await exportImage({ previewId: custom.previewId, action: "save" }));
  assert.ok(firstExport.pngPath && secondExport.pngPath);
  assert.notEqual(firstExport.pngPath, secondExport.pngPath);
  assert.deepEqual(await readFile(firstExport.pngPath), await readFile(custom.pngPath));
  assert.ok(firstExport.pngPath.startsWith(join(root, "exports")));
  json(await exportImage({ previewId: custom.previewId, action: "copy" }));
  assert.equal(clipboard.copied?.file, custom.pngPath);
  clipboard.failCopy = true;
  await assert.rejects(exportImage({ previewId: custom.previewId, action: "copy" }), /Clipboard unavailable/);
  clipboard.failCopy = false;
  await assert.rejects(exportImage({ previewId: "../../secret", action: "save" }), /previewId/);
  await unlink(custom.pngPath);
  await assert.rejects(exportImage({ previewId: custom.previewId, action: "save" }), /no longer available/);

  const confirmation = await remove.confirmation({ id: saved.draft.id });
  assert.equal(confirmation?.style, "destructive");
  assert.ok(confirmation && confirmation.info?.some((item) => item.value === "AI edited draft"));
  assert.deepEqual(json(await remove.default({ id: saved.draft.id })), { deleted: true, id: saved.draft.id });
  assert.equal((await list({ query: "AI edited draft" })).totalCount, 0);
  await assert.rejects(render({ source: { draftId: saved.draft.id } }), /could not be read/);
  console.log(
    JSON.stringify({
      test: "Eight production AI tools: rendering, inspection, all comparisons, clipboard, exports, draft CRUD/retention, media preservation, retry deduplication, errors, and JSON cloneability",
      result: "passed",
    }),
  );
}
