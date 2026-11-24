import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readMarkdownFrontmatter, scanMarkdownFiles, scanPaths, splitMarkdownFrontmatter } from "@lib/files";
import { createTempDir, removeDir, writeTextFile } from "../helpers/fs";

const workspaceMarker = ".octarine";

let tempDir: string | undefined;

afterEach(async () => {
  vi.restoreAllMocks();

  if (tempDir) {
    await removeDir(tempDir);
    tempDir = undefined;
  }
});

describe("files", () => {
  it("returns the root workspace without scanning its children, dedupes overlaps, and marks invalid roots", async () => {
    tempDir = await createTempDir("octarine-workspace-roots");

    const root = path.join(tempDir, "root");
    const nestedRoot = path.join(root, "nested");
    const invalidRoot = path.join(tempDir, "missing");

    await writeTextFile(path.join(root, workspaceMarker, "config.json"), "{}");
    await writeTextFile(path.join(root, "Alpha", workspaceMarker, "config.json"), "{}");
    await writeTextFile(path.join(nestedRoot, "Beta", workspaceMarker, "config.json"), "{}");
    await writeTextFile(path.join(root, "SkipMe", workspaceMarker, "config.json"), "{}");
    await writeTextFile(path.join(root, "Notebooks", "Gamma", workspaceMarker, "config.json"), "{}");

    const result = await scanPaths([root, nestedRoot, invalidRoot], new Set(["skipme"]));

    expect(result.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: invalidRoot, ignored: false, invalid: true },
      { path: root, ignored: false, invalid: false },
      { path: path.join(nestedRoot, "Beta"), ignored: false, invalid: false },
    ]);
  });

  it("scans direct children when the root is not a workspace and ignores symlink directories", async () => {
    tempDir = await createTempDir("octarine-workspace-scan-rules");

    const root = path.join(tempDir, "skipme");
    const realRoot = path.join(root, "Real");
    const deepRoot = path.join(root, "Collections");
    const symlinkRoot = path.join(root, "Linked");

    await writeTextFile(path.join(realRoot, workspaceMarker, "config.json"), "{}");
    await writeTextFile(path.join(deepRoot, "Delta", workspaceMarker, "config.json"), "{}");
    await fs.symlink(realRoot, symlinkRoot);

    const result = await scanPaths([root], new Set(["skipme"]));

    expect(result).toEqual([{ path: realRoot, ignored: false, invalid: false }]);
  });

  it("scans markdown files recursively and returns posix relative paths", async () => {
    tempDir = await createTempDir("octarine-files");

    const rootPath = path.join(tempDir, "Workspace");

    await writeTextFile(path.join(rootPath, "root.md"), "# Root");
    await writeTextFile(path.join(rootPath, "docs", "Guide.md"), "# Guide");
    await writeTextFile(path.join(rootPath, "docs", "nested", "Deep.md"), "# Deep");
    await writeTextFile(path.join(rootPath, "docs", "image.png"), "png");

    const files = await scanMarkdownFiles(rootPath, new Set());

    expect(files.map((file) => file.relative).sort((a, b) => a.localeCompare(b))).toEqual([
      "docs/Guide.md",
      "docs/nested/Deep.md",
      "root.md",
    ]);
  });

  it("skips excluded directories", async () => {
    tempDir = await createTempDir("octarine-files-excluded");

    const rootPath = path.join(tempDir, "Workspace");

    await writeTextFile(path.join(rootPath, "root.md"), "# Root");
    await writeTextFile(path.join(rootPath, "Archive", "Hidden.md"), "# Hidden");

    const files = await scanMarkdownFiles(rootPath, new Set(["archive"]));

    expect(files.map((file) => file.relative)).toEqual(["root.md"]);
  });

  it("reads only the frontmatter block", async () => {
    tempDir = await createTempDir("octarine-files-frontmatter");

    const filePath = path.join(tempDir, "Note.md");
    await writeTextFile(filePath, "---\npinned: true\n---\ncontent");

    await expect(readMarkdownFrontmatter(filePath)).resolves.toBe("---\npinned: true\n---");
  });

  it("splits a BOM frontmatter block using a dotted closing fence", () => {
    const content = "\uFEFF---\r\ntitle: Note\r\n...\r\n\r\n# Body\r\n";

    expect(splitMarkdownFrontmatter(content)).toEqual({
      frontmatter: "---\r\ntitle: Note\r\n...",
      body: "# Body\r\n",
    });
  });

  it("does not treat an indented block-scalar line as the frontmatter closing fence", () => {
    const content = "---\ndescription: |\n  ---\n  keep\npinned: true\n---\n\n# Body";

    expect(splitMarkdownFrontmatter(content)).toEqual({
      frontmatter: "---\ndescription: |\n  ---\n  keep\npinned: true\n---",
      body: "# Body",
    });
  });

  it("strips a structurally closed frontmatter block even when its YAML is invalid", () => {
    expect(splitMarkdownFrontmatter("---\ntitle: [malformed\n---\n# Body")?.body).toBe("# Body");
  });

  it("does not split an incomplete or non-leading frontmatter block", () => {
    expect(splitMarkdownFrontmatter("# Body")).toBeUndefined();
    expect(splitMarkdownFrontmatter("---\ntitle: Note\n# Body")).toBeUndefined();
    expect(splitMarkdownFrontmatter("# Note\n---\ntitle: Note\n---\n# Body")).toBeUndefined();
    expect(splitMarkdownFrontmatter("  ---\ntitle: Note\n---\n# Body")).toBeUndefined();
    expect(splitMarkdownFrontmatter("--- \t\ntitle: Note\n---\n# Body")).toEqual(
      expect.objectContaining({ body: "# Body" }),
    );
  });

  it("stops immediately when the file does not start with frontmatter", async () => {
    tempDir = await createTempDir("octarine-files-no-frontmatter");

    const filePath = path.join(tempDir, "Note.md");
    await writeTextFile(filePath, "# Note\n---\npinned: true\n---\ncontent");

    await expect(readMarkdownFrontmatter(filePath)).resolves.toBeUndefined();
  });

  it("throws a path-based error when a directory cannot be read", async () => {
    tempDir = await createTempDir("octarine-files-error");

    const rootPath = path.join(tempDir, "Workspace");
    await writeTextFile(path.join(rootPath, "root.md"), "# Root");

    const { readdir } = fs;
    vi.spyOn(fs, "readdir").mockImplementation((target, options) => {
      if (target === rootPath) {
        return Promise.reject(new Error("EACCES"));
      }

      return readdir(target, options);
    });

    await expect(scanMarkdownFiles(rootPath, new Set())).rejects.toThrow(`Failed to read directory ${rootPath}`);
  });
});
