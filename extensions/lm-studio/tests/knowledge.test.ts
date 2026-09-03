import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const localStorage = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: path.join(os.tmpdir(), "lm-studio-raycast-tests"),
  },
  LocalStorage: {
    getItem: vi.fn(async (key: string) => localStorage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => localStorage.set(key, value)),
    removeItem: vi.fn(async (key: string) => localStorage.delete(key)),
  },
}));

import {
  buildKnowledgeIndex,
  chunkText,
  cosineSimilarity,
  listKnowledgeIndexes,
  rankKnowledgeChunks,
  type EmbeddingFunction,
  type KnowledgeChunk,
} from "../src/lib/knowledge";

const temporaryPaths: string[] = [];

afterEach(async () => {
  localStorage.clear();
  await Promise.all(
    temporaryPaths.splice(0).map((temporaryPath) => rm(temporaryPath, { recursive: true, force: true })),
  );
});

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lm-studio-knowledge-"));
  temporaryPaths.push(directory);
  return directory;
}

describe("chunkText", () => {
  it("creates overlapping chunks with source line ranges", () => {
    const text = ["first line", "second line", "third line", "fourth line"].join("\n");
    const chunks = chunkText(text, { size: 22, overlap: 6 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({ startLine: 1 });
    expect(chunks.at(-1)?.endLine).toBe(4);
    expect(chunks.every((chunk) => chunk.text.length > 0)).toBe(true);
  });

  it("normalizes CRLF and ignores whitespace-only input", () => {
    expect(chunkText("  \r\n\t  ")).toEqual([]);
    expect(chunkText("one\r\ntwo", { size: 100 })[0]).toMatchObject({
      text: "one\ntwo",
      startLine: 1,
      endLine: 2,
    });
  });
});

describe("cosine ranking", () => {
  const chunks: KnowledgeChunk[] = [
    {
      id: "best",
      hash: "best",
      text: "best",
      embedding: [1, 0],
      sources: [{ path: "/best", startLine: 1, endLine: 1 }],
    },
    {
      id: "middle",
      hash: "middle",
      text: "middle",
      embedding: [1, 1],
      sources: [{ path: "/middle", startLine: 1, endLine: 1 }],
    },
    {
      id: "opposite",
      hash: "opposite",
      text: "opposite",
      embedding: [-1, 0],
      sources: [{ path: "/opposite", startLine: 1, endLine: 1 }],
    },
  ];

  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(-1);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(-1);
  });

  it("sorts by similarity and obeys the result limit", () => {
    expect(rankKnowledgeChunks(chunks, [1, 0], 2).map(({ chunk }) => chunk.id)).toEqual(["best", "middle"]);
    expect(rankKnowledgeChunks(chunks, [1, 0], 3).map(({ chunk }) => chunk.id)).toEqual(["best", "middle", "opposite"]);
  });
});

describe("buildKnowledgeIndex", () => {
  it("skips hidden content and symlinks, deduplicates chunks, and reuses vectors", async () => {
    const root = await temporaryDirectory();
    const outsideRoot = await temporaryDirectory();
    const supportPath = await temporaryDirectory();
    const hiddenDirectory = path.join(root, ".private");
    await mkdir(hiddenDirectory);
    await writeFile(path.join(hiddenDirectory, "secret.md"), "do not index");

    const content = Array.from({ length: 700 }, (_, index) => `token-${index}`).join(" ");
    const firstNote = path.join(root, "first.md");
    const duplicateNote = path.join(root, "duplicate.txt");
    await writeFile(firstNote, content);
    await writeFile(duplicateNote, content);
    await symlink(firstNote, path.join(root, "linked.md"));
    await writeFile(path.join(outsideRoot, "escaped.md"), "outside content must not be embedded");
    await symlink(outsideRoot, path.join(root, "linked-directory"));

    let embeddedTextCount = 0;
    const embed: EmbeddingFunction = vi.fn(async (texts) => {
      embeddedTextCount += texts.length;
      return texts.map((text, index) => [text.length, index + 1]);
    });

    const first = await buildKnowledgeIndex({
      folders: [root],
      model: "embed-model",
      embed,
      supportPath,
    });
    expect(first.index.files).toHaveLength(2);
    expect(first.index.chunks.length).toBeGreaterThan(1);
    expect(first.index.chunks.every((chunk) => chunk.sources.length === 2)).toBe(true);
    expect(first.index.chunks.some((chunk) => chunk.text.includes("do not index"))).toBe(false);
    expect(first.index.chunks.some((chunk) => chunk.text.includes("outside content must not be embedded"))).toBe(false);
    expect(first.embeddedChunkCount).toBe(first.index.chunks.length);

    embeddedTextCount = 0;
    const second = await buildKnowledgeIndex({
      folders: [root],
      model: "embed-model",
      embed,
      supportPath,
    });
    expect(second.embeddedChunkCount).toBe(1);
    expect(second.reusedChunkCount).toBe(second.index.chunks.length - 1);
    expect(embeddedTextCount).toBe(1);
  });

  it("rejects a selected folder that is itself a symlink", async () => {
    const root = await temporaryDirectory();
    const selectionDirectory = await temporaryDirectory();
    const supportPath = await temporaryDirectory();
    await writeFile(path.join(root, "notes.md"), "private linked notes");
    const selectedRoot = path.join(selectionDirectory, "linked-notes");
    await symlink(root, selectedRoot);
    const embed: EmbeddingFunction = vi.fn(async (texts) => texts.map(() => [1, 2]));

    const result = await buildKnowledgeIndex({
      folders: [selectedRoot],
      model: "embed-model",
      embed,
      supportPath,
    });

    expect(result.discoveredFileCount).toBe(0);
    expect(result.skippedFileCount).toBeGreaterThan(0);
    expect(result.index.files).toEqual([]);
    expect(result.index.chunks).toEqual([]);
    expect(embed).not.toHaveBeenCalled();
  });

  it("isolates indexes when the same model changes vector dimension", async () => {
    const root = await temporaryDirectory();
    const supportPath = await temporaryDirectory();
    await writeFile(path.join(root, "notes.md"), "A useful note about local language models.");

    await buildKnowledgeIndex({
      folders: [root],
      model: "embed-model",
      embed: async (texts) => texts.map(() => [1, 2]),
      supportPath,
    });
    await buildKnowledgeIndex({
      folders: [root],
      model: "embed-model",
      embed: async (texts) => texts.map(() => [1, 2, 3]),
      supportPath,
    });

    const indexes = await listKnowledgeIndexes(supportPath);
    expect(indexes.map((index) => index.dimension).sort()).toEqual([2, 3]);
    expect(new Set(indexes.map((index) => index.id)).size).toBe(2);
  });
});
