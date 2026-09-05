import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import type { SearchError, SearchOptions, SearchResult } from "../types/search.ts";
import { FallbackEngine } from "./fallback-engine.ts";

const BASE_OPTIONS: SearchOptions = {
  caseMode: "smart",
  searchMode: "text",
  wholeWord: false,
  multiline: false,
  invertMatch: false,
  maxDepth: null,
  includeHidden: false,
  followSymlinks: false,
  respectIgnoreFiles: true,
  includeBinary: false,
  searchFileNames: false,
  includedExtensions: [],
  excludedExtensions: [],
  excludedDirectories: [],
  includeGlobs: [],
  excludeGlobs: [],
  maxResults: 250,
  maxFileSizeBytes: 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

async function makeTree(files: Record<string, string | Buffer>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "folder-scope-fallback-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(root, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
  return root;
}

interface RunOutcome {
  results: SearchResult[];
  completion: { limitReached: boolean; cancelled: boolean };
}

async function run(
  root: string,
  query: string,
  overrides: Partial<SearchOptions> = {},
  configure?: (controller: AbortController, results: SearchResult[]) => (batch: SearchResult[]) => void,
): Promise<RunOutcome> {
  const results: SearchResult[] = [];
  const controller = new AbortController();
  const onResults = configure?.(controller, results) ?? ((batch: SearchResult[]) => results.push(...batch));
  const completion = await new FallbackEngine().search({
    query,
    directory: root,
    options: { ...BASE_OPTIONS, ...overrides },
    signal: controller.signal,
    onResults,
  });
  return { results, completion };
}

test("finds matches recursively in Turkish and space-containing paths", async () => {
  const root = await makeTree({
    "Arama Klasörü/ölçüm.txt": "ilk satır\nburada ara bul\n",
    "kök.txt": "ara\n",
  });
  try {
    const { results, completion } = await run(root, "ara");
    assert.equal(completion.cancelled, false);
    assert.equal(completion.limitReached, false);
    assert.deepEqual(results.map((result) => result.relativePath).sort(), ["Arama Klasörü/ölçüm.txt", "kök.txt"]);
    const nested = results.find((result) => result.fileName === "ölçüm.txt");
    assert.equal(nested?.line, 2);
    assert.equal(nested?.column, 8);
    assert.equal(nested?.lineText, "burada ara bul");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skips hidden entries by default and searches them when enabled", async () => {
  const root = await makeTree({ ".gizli/veri.txt": "ara\n", "açık.txt": "ara\n" });
  try {
    const visible = await run(root, "ara");
    assert.deepEqual(
      visible.results.map((result) => result.relativePath),
      ["açık.txt"],
    );
    const hidden = await run(root, "ara", { includeHidden: true });
    assert.equal(hidden.results.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("honors excluded directories and depth limit", async () => {
  const root = await makeTree({
    "a.txt": "ara\n",
    "alt/b.txt": "ara\n",
    "node_modules/c.txt": "ara\n",
  });
  try {
    const excluded = await run(root, "ara", { excludedDirectories: ["node_modules"] });
    assert.deepEqual(excluded.results.map((result) => result.relativePath).sort(), ["a.txt", "alt/b.txt"]);
    const shallow = await run(root, "ara", { maxDepth: 1 });
    assert.deepEqual(
      shallow.results.map((result) => result.relativePath),
      ["a.txt"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applies extension and glob filters", async () => {
  const root = await makeTree({
    "a.ts": "ara\n",
    "b.md": "ara\n",
    "dist/c.ts": "ara\n",
  });
  try {
    const included = await run(root, "ara", { includedExtensions: ["ts"] });
    assert.deepEqual(included.results.map((result) => result.relativePath).sort(), ["a.ts", "dist/c.ts"]);
    const excluded = await run(root, "ara", { includedExtensions: ["ts"], excludeGlobs: ["**/dist/**"] });
    assert.deepEqual(
      excluded.results.map((result) => result.relativePath),
      ["a.ts"],
    );
    const byExtension = await run(root, "ara", { excludedExtensions: ["md"] });
    assert.deepEqual(byExtension.results.map((result) => result.relativePath).sort(), ["a.ts", "dist/c.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skips binary files by default and includes them on request", async () => {
  const binary = Buffer.concat([Buffer.from([0x00, 0x01]), Buffer.from("ara sonrası")]);
  const root = await makeTree({ "ikili.bin": binary, "metin.txt": "ara\n" });
  try {
    const skipped = await run(root, "ara");
    assert.deepEqual(
      skipped.results.map((result) => result.relativePath),
      ["metin.txt"],
    );
    const included = await run(root, "ara", { includeBinary: true });
    assert.equal(included.results.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skips files above the size limit", async () => {
  const root = await makeTree({
    "büyük.txt": `ara ${"x".repeat(4096)}\n`,
    "küçük.txt": "ara\n",
  });
  try {
    const { results } = await run(root, "ara", { maxFileSizeBytes: 1024 });
    assert.deepEqual(
      results.map((result) => result.relativePath),
      ["küçük.txt"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("honors .gitignore rules and can bypass them", async () => {
  const root = await makeTree({
    ".gitignore": "*.log\nyapı/\n",
    "app.log": "ara\n",
    "app.txt": "ara\n",
    "yapı/derleme.txt": "ara\n",
  });
  try {
    const respected = await run(root, "ara");
    assert.deepEqual(
      respected.results.map((result) => result.relativePath),
      ["app.txt"],
    );
    const bypassed = await run(root, "ara", { respectIgnoreFiles: false });
    assert.equal(bypassed.results.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stops at the result limit and reports it", async () => {
  const root = await makeTree({
    "a.txt": "ara\nara\n",
    "b.txt": "ara\nara\n",
    "c.txt": "ara\nara\n",
  });
  try {
    const { results, completion } = await run(root, "ara", { maxResults: 3 });
    assert.equal(results.length, 3);
    assert.equal(completion.limitReached, true);
    assert.equal(completion.cancelled, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("returns cancelled immediately for a pre-aborted signal", async () => {
  const root = await makeTree({ "a.txt": "ara\n" });
  try {
    const results: SearchResult[] = [];
    const controller = new AbortController();
    controller.abort();
    const completion = await new FallbackEngine().search({
      query: "ara",
      directory: root,
      options: BASE_OPTIONS,
      signal: controller.signal,
      onResults: (batch) => results.push(...batch),
    });
    assert.equal(completion.cancelled, true);
    assert.equal(results.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stops emitting after cancellation mid-search", async () => {
  const files: Record<string, string> = {};
  for (let index = 0; index < 40; index++) files[`dosya-${index}.txt`] = "ara\n";
  const root = await makeTree(files);
  try {
    let emittedAtAbort = 0;
    const { results, completion } = await run(root, "ara", {}, (controller, results) => (batch) => {
      results.push(...batch);
      if (!controller.signal.aborted) {
        emittedAtAbort = results.length;
        controller.abort();
      }
    });
    assert.equal(completion.cancelled, true);
    assert.equal(results.length, emittedAtAbort);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("follows symlinks without looping and tolerates dangling links", async () => {
  const root = await makeTree({ "a/dosya.txt": "ara\n" });
  try {
    await symlink(root, join(root, "a", "geri"));
    await symlink(join(root, "yok"), join(root, "a", "kopuk"));
    const { results, completion } = await run(root, "ara", { followSymlinks: true });
    assert.equal(completion.cancelled, false);
    assert.equal(results.length, 1);
    const ignoredLinks = await run(root, "ara");
    assert.equal(ignoredLinks.results.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("skips unreadable files and continues", async () => {
  const root = await makeTree({ "kapalı.txt": "ara\n", "açık.txt": "ara\n" });
  try {
    await chmod(join(root, "kapalı.txt"), 0o000);
    const { results } = await run(root, "ara");
    assert.deepEqual(
      results.map((result) => result.relativePath),
      ["açık.txt"],
    );
  } finally {
    await chmod(join(root, "kapalı.txt"), 0o600);
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects with directory-inaccessible when the root cannot be read", async () => {
  const root = await makeTree({ "a.txt": "ara\n" });
  try {
    await chmod(root, 0o000);
    await assert.rejects(
      () => run(root, "ara"),
      (error: unknown) => (error as SearchError).kind === "directory-inaccessible",
    );
  } finally {
    await chmod(root, 0o700);
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects invalid regular expressions with invalid-query", async () => {
  const root = await makeTree({ "a.txt": "ara\n" });
  try {
    await assert.rejects(
      () => run(root, "(", { searchMode: "regex" }),
      (error: unknown) => (error as SearchError).kind === "invalid-query",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("attaches context lines around matches", async () => {
  const root = await makeTree({ "a.txt": "önce\nara bul\nsonra\n" });
  try {
    const { results } = await run(root, "ara", { contextBefore: 1, contextAfter: 1 });
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].contextBefore, ["önce"]);
    assert.deepEqual(results[0].contextAfter, ["sonra"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
