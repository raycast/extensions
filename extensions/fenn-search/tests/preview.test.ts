import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadPreview, MAX_INLINE_BYTES, nativePreviewUrl } from "../src/preview";
import { resultMarkdown } from "../src/search-model";

const signal = () => new AbortController().signal;

test("small previews retain rounding; large previews stay local URLs without reading image bytes", async (context) => {
  const dir = await fs.mkdtemp(join(tmpdir(), "fenn-preview-"));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  const small = join(dir, "small.png");
  await fs.writeFile(
    small,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const url = await loadPreview(small, signal());
  assert.ok(url?.startsWith("data:image/svg+xml;base64,"));
  assert.match(Buffer.from(url!.split(",")[1], "base64").toString(), /rx="12"/);
  const large = join(dir, "large.png");
  await fs.writeFile(large, Buffer.alloc(MAX_INLINE_BYTES + 1));
  const open = context.mock.method(fs, "open", async () => {
    throw new Error("must not read large image");
  });
  const fallback = await loadPreview(large, signal());
  assert.ok(fallback?.startsWith("file://"));
  assert.ok(fallback!.length < 1000);
  assert.equal(open.mock.callCount(), 0);
});

test("stalled reads keep one slot until cleanup; new selections use native previews without queuing", async (context) => {
  const dir = await fs.mkdtemp(join(tmpdir(), "fenn-stalled-preview-"));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  const path = join(dir, "preview.png");
  await fs.writeFile(path, "image");
  let finishRead!: (value: { bytesRead: number }) => void;
  let enteredRead!: () => void;
  const reading = new Promise<void>((resolve) => {
    enteredRead = resolve;
  });
  let closeCount = 0;
  const open = context.mock.method(fs, "open", async () => ({
    read: () => {
      enteredRead();
      return new Promise<{ bytesRead: number }>((resolve) => {
        finishRead = resolve;
      });
    },
    close: async () => {
      closeCount++;
    },
  }));
  const controller = new AbortController();
  const pending = loadPreview(path, controller.signal);
  await reading;
  const rejected = assert.rejects(pending, { name: "AbortError" });
  controller.abort();
  for (let i = 0; i < 20; i++) {
    assert.equal(await loadPreview(path, signal()), nativePreviewUrl(path));
  }
  assert.equal(open.mock.callCount(), 1);
  assert.equal(closeCount, 0);
  finishRead({ bytesRead: 0 });
  await rejected;
  assert.equal(closeCount, 1);
  open.mock.restore();
  // The slot is released after real cleanup, so later selections can load.
  assert.equal(await loadPreview(path, signal()), nativePreviewUrl(path));
});

test("a slow selected preview finishes without a timeout or reselection", async (context) => {
  const originalStat = fs.stat.bind(fs);
  let release!: () => void;
  const delay = new Promise<void>((resolve) => {
    release = resolve;
  });
  context.mock.method(fs, "stat", async (...args: Parameters<typeof fs.stat>) => {
    await delay;
    return originalStat(...args);
  });
  const dir = await fs.mkdtemp(join(tmpdir(), "fenn-slow-preview-"));
  context.after(() => fs.rm(dir, { recursive: true, force: true }));
  const path = join(dir, "preview.png");
  await fs.writeFile(
    path,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const pending = loadPreview(path, signal());
  assert.ok(nativePreviewUrl(path)?.startsWith("file://"));
  await new Promise((resolve) => setTimeout(resolve, 2100));
  release();
  assert.ok((await pending)?.startsWith("data:image/svg+xml;base64,"));
});

test("missing previews can be omitted without hiding matches", async () => {
  await assert.rejects(loadPreview("/nonexistent-fenn-preview/image.png", signal()));
  const markdown = resultMarkdown(
    {
      original_file: "/tmp/a.pdf",
      filename: "a.pdf",
      generated_file: "/missing.png",
      most_relevant_pages: [{ page: 4, content: "matching text" }],
    },
    null,
  );
  assert.doesNotMatch(markdown, /!\[File preview\]/);
  assert.match(markdown, /Page 4/);
  assert.match(markdown, /matching text/);
});
