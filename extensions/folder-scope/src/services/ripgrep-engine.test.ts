import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { SearchError, SearchOptions, SearchRequest, SearchResult } from "../types/search.ts";
import { RipgrepEngine } from "./ripgrep-engine.ts";

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

async function executableScript(source: string): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const directory = await mkdtemp(join(tmpdir(), "folder-scope-rg-engine-"));
  const scriptPath = join(directory, "fake rg");
  await writeFile(scriptPath, `#!/usr/bin/env node\n${source}`);
  await chmod(scriptPath, 0o755);
  return { path: scriptPath, cleanup: () => rm(directory, { recursive: true, force: true }) };
}

function request(
  signal: AbortSignal,
  onResults: (batch: SearchResult[]) => void,
  options: SearchOptions = BASE_OPTIONS,
): SearchRequest {
  return {
    query: "ara",
    directory: "/tmp/Arama Klasörü",
    options,
    signal,
    onResults,
  };
}

test("streams JSON results from a spawned executable", async () => {
  const match = JSON.stringify({
    type: "match",
    data: {
      path: { text: "/tmp/Arama Klasörü/ölçüm.txt" },
      lines: { text: "ara\n" },
      line_number: 4,
      submatches: [{ start: 0, end: 3, match: { text: "ara" } }],
    },
  });
  const fake = await executableScript(
    `const value = ${JSON.stringify(`${match}\n`)}; process.stdout.write(value.slice(0, 9)); setTimeout(() => process.stdout.end(value.slice(9)), 10);`,
  );
  try {
    const results: SearchResult[] = [];
    const engine = new RipgrepEngine("system-ripgrep", async () => fake.path);
    const completion = await engine.search(request(new AbortController().signal, (batch) => results.push(...batch)));
    assert.deepEqual(completion, { limitReached: false, cancelled: false });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.fileName, "ölçüm.txt");
  } finally {
    await fake.cleanup();
  }
});

test("treats ripgrep exit code 1 as a successful no-match search", async () => {
  const fake = await executableScript("process.exitCode = 1;");
  try {
    const engine = new RipgrepEngine("system-ripgrep", async () => fake.path);
    assert.deepEqual(await engine.search(request(new AbortController().signal, () => undefined)), {
      limitReached: false,
      cancelled: false,
    });
  } finally {
    await fake.cleanup();
  }
});

test("surfaces malformed output separately without crashing the process", async () => {
  const fake = await executableScript('process.stdout.write("{broken}\\n");');
  try {
    const engine = new RipgrepEngine("system-ripgrep", async () => fake.path);
    await assert.rejects(
      engine.search(request(new AbortController().signal, () => undefined)),
      (error: SearchError) => {
        assert.equal(error.kind, "unexpected");
        assert.match(error.message, /malformed JSON/);
        return true;
      },
    );
  } finally {
    await fake.cleanup();
  }
});

test("classifies regex errors and unexpected exits", async () => {
  const regexFailure = await executableScript(
    'process.stderr.write("regex parse error: unclosed group"); process.exitCode = 2;',
  );
  const crash = await executableScript('process.stderr.write("permission denied"); process.exitCode = 2;');
  try {
    const regexEngine = new RipgrepEngine("system-ripgrep", async () => regexFailure.path);
    await assert.rejects(
      regexEngine.search(
        request(new AbortController().signal, () => undefined, { ...BASE_OPTIONS, searchMode: "regex" }),
      ),
      (error: SearchError) => error.kind === "invalid-query",
    );

    const crashEngine = new RipgrepEngine("system-ripgrep", async () => crash.path);
    await assert.rejects(
      crashEngine.search(request(new AbortController().signal, () => undefined)),
      (error: SearchError) => error.kind === "engine-crashed",
    );
  } finally {
    await regexFailure.cleanup();
    await crash.cleanup();
  }
});

test("distinguishes startup failure, cancellation, and result-limit termination", async () => {
  const startupEngine = new RipgrepEngine("system-ripgrep", async () => "/path/that/does/not/exist/rg");
  await assert.rejects(
    startupEngine.search(request(new AbortController().signal, () => undefined)),
    (error: SearchError) => error.kind === "engine-startup-failed",
  );

  const waiting = await executableScript("setInterval(() => undefined, 1000);");
  const match = JSON.stringify({
    type: "match",
    data: {
      path: { text: "/tmp/Arama Klasörü/file.txt" },
      lines: { text: "ara ara\n" },
      line_number: 1,
      submatches: [
        { start: 0, end: 3, match: { text: "ara" } },
        { start: 4, end: 7, match: { text: "ara" } },
      ],
    },
  });
  const manyResults = await executableScript(
    `process.stdout.write(${JSON.stringify(`${match}\n`)}); setInterval(() => undefined, 1000);`,
  );
  try {
    const controller = new AbortController();
    const cancellationEngine = new RipgrepEngine("system-ripgrep", async () => waiting.path);
    const cancellation = cancellationEngine.search(request(controller.signal, () => undefined));
    setTimeout(() => controller.abort(), 25);
    assert.deepEqual(await cancellation, { limitReached: false, cancelled: true });

    const results: SearchResult[] = [];
    const limitedEngine = new RipgrepEngine("system-ripgrep", async () => manyResults.path);
    const completion = await limitedEngine.search(
      request(new AbortController().signal, (batch) => results.push(...batch), { ...BASE_OPTIONS, maxResults: 1 }),
    );
    assert.deepEqual(completion, { limitReached: true, cancelled: false });
    assert.equal(results.length, 1);
  } finally {
    await waiting.cleanup();
    await manyResults.cleanup();
  }
});

test("cancels promptly while an executable is still being resolved", async () => {
  const controller = new AbortController();
  const engine = new RipgrepEngine("bundled-ripgrep", () => new Promise<string>(() => undefined));
  const completion = engine.search(request(controller.signal, () => undefined));
  controller.abort();
  assert.deepEqual(await completion, { limitReached: false, cancelled: true });
});
