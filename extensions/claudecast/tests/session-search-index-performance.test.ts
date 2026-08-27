import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

test("indexes hundreds of sessions in a separate process", async (t) => {
  const root = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "claudecast-index-performance-"),
  );
  const transcripts = path.join(root, "transcripts");
  const index = path.join(root, "index");
  await fs.promises.mkdir(transcripts, { recursive: true });
  t.after(async () => {
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  const files = Array.from({ length: 300 }, (_, fileIndex) => {
    const lines = Array.from({ length: 20 }, (_, lineIndex) =>
      JSON.stringify({
        type: lineIndex % 2 === 0 ? "user" : "assistant",
        message: {
          role: lineIndex % 2 === 0 ? "user" : "assistant",
          content:
            fileIndex === 299 && lineIndex === 19
              ? "unique performance marker"
              : `fixture ${fileIndex} line ${lineIndex} repeated transcript text`,
        },
      }),
    ).join("\n");
    return fs.promises.writeFile(
      path.join(transcripts, `${String(fileIndex).padStart(4, "0")}.jsonl`),
      `${lines}\n`,
    );
  });
  await Promise.all(files);

  const childPath = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "session-search-index-perf-child.ts",
  );
  const { stdout } = await execFilePromise(
    process.execPath,
    [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      "--experimental-strip-types",
      childPath,
      transcripts,
      index,
    ],
    { timeout: 20_000, maxBuffer: 1024 * 1024 },
  );
  const result = JSON.parse(stdout) as {
    elapsedMs: number;
    files: number;
    matches: number;
    reopenTranscriptReads: number;
  };

  assert.equal(result.files, 300);
  assert.equal(result.matches, 1);
  assert.equal(result.reopenTranscriptReads, 0);
  assert.ok(result.elapsedMs < 15_000, `Index took ${result.elapsedMs} ms`);
});
