import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { saveMarkdownToFile } from "../src/lib/save";
import type { CommandPreferences } from "../src/lib/types";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "web-to-md-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("saveMarkdownToFile keeps non-Latin titles instead of falling back to a timestamp", async () => {
  await withTempDir(async (dir) => {
    const saved = await saveMarkdownToFile({
      title: "日本語のタイトル",
      markdown: "# Hi",
      url: "https://example.com/post",
      preferences: { outputDirectory: dir },
    });

    assert.equal(path.basename(saved), "日本語のタイトル.md");
  });
});

test("saveMarkdownToFile falls back to the URL when the title has no usable characters", async () => {
  await withTempDir(async (dir) => {
    const saved = await saveMarkdownToFile({
      title: "🎉🎉🎉",
      markdown: "# Hi",
      url: "https://example.com/blog/my-post",
      preferences: { outputDirectory: dir },
    });

    assert.equal(path.basename(saved), "example-com-blog-my-post.md");
  });
});

test("saveMarkdownToFile does not lose files when saves race", async () => {
  await withTempDir(async (dir) => {
    const preferences: CommandPreferences = { outputDirectory: dir };
    const saves = Array.from({ length: 5 }, (_, i) =>
      saveMarkdownToFile({
        title: "Same Title",
        markdown: `# Body ${i}`,
        url: "https://example.com/post",
        preferences,
      }),
    );

    const paths = await Promise.all(saves);

    assert.equal(new Set(paths).size, 5, "each save needs its own path");
    assert.equal((await fs.readdir(dir)).length, 5, "no file may be lost");
  });
});

test("saveMarkdownToFile writes markdown and dedupes filename", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "web-to-md-"));
  try {
    const preferences: CommandPreferences = {
      outputDirectory: dir,
      fileNameStyle: "title-slug",
    };

    const first = await saveMarkdownToFile({
      title: "Hello World",
      markdown: "# Hello",
      url: "https://example.com",
      preferences,
    });
    const second = await saveMarkdownToFile({
      title: "Hello World",
      markdown: "# Hello again",
      url: "https://example.com",
      preferences,
    });

    assert.ok(first.endsWith(path.join(dir, "hello-world.md")));
    assert.ok(second.endsWith(path.join(dir, "hello-world-2.md")));

    const content1 = await fs.readFile(first, "utf8");
    const content2 = await fs.readFile(second, "utf8");
    assert.equal(content1, "# Hello");
    assert.equal(content2, "# Hello again");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
