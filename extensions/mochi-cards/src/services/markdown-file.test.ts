import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  markdownFileExists,
  MarkdownFileExistsError,
  sanitizeMarkdownFilename,
  saveMarkdownFile,
} from "./markdown-file";

describe("markdown file", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it("sanitizes filenames and always uses the .md extension", () => {
    expect(sanitizeMarkdownFilename("../Greek: card")).toBe("..-Greek- card.md");
    expect(sanitizeMarkdownFilename("notes.MD")).toBe("notes.MD");
    expect(sanitizeMarkdownFilename("...")).toBe("mochi-card.md");
  });

  it("writes UTF-8 and requires explicit overwrite", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mochi-cards-test-"));
    directories.push(directory);

    const path = await saveMarkdownFile(directory, "card", "πρώτη", false);
    expect(await readFile(path, "utf8")).toBe("πρώτη");
    expect(await markdownFileExists(directory, "card.md")).toBe(true);
    await expect(saveMarkdownFile(directory, "card.md", "δεύτερη", false)).rejects.toBeInstanceOf(
      MarkdownFileExistsError
    );

    await saveMarkdownFile(directory, "card.md", "δεύτερη", true);
    expect(await readFile(path, "utf8")).toBe("δεύτερη");
  });
});
