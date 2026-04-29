import test from "node:test";
import assert from "node:assert/strict";
import os from "os";
import path from "path";
import { promises as fs } from "fs";
import { saveMarkdownToFile } from "../src/lib/save";
import type { CommandPreferences } from "../src/lib/types";

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

