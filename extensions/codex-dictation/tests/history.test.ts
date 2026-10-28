import assert from "node:assert/strict";
import { mkdtemp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { CodexPaths } from "../src/codex-paths";
import { formatDate } from "../src/format";
import { loadDictationHistory } from "../src/history";
import type { LoadState } from "../src/types";
import { watchDictationHistory } from "../src/watch-history";

async function fixture(t: TestContext): Promise<CodexPaths> {
  const codexHome = await mkdtemp(join(tmpdir(), "codex-dictation-test-"));
  t.after(() => rm(codexHome, { recursive: true, force: true }));
  return {
    codexHome,
    historyPath: join(codexHome, "transcription-history.jsonl"),
    configPath: join(codexHome, "config.toml"),
    keybindingsPath: join(codexHome, "keybindings.json"),
  };
}

function entry(id: string, createdAtMs = 1) {
  return { id, createdAtMs, text: `Dictation ${id}` };
}

test("skips malformed entries and out-of-range dates while retaining valid boundaries", async (t) => {
  const paths = await fixture(t);
  const valid = [entry("old", -8.64e15), entry("new", 8.64e15)];
  await writeFile(
    paths.historyPath,
    [
      JSON.stringify(valid[0]),
      "",
      "not json",
      JSON.stringify(entry("outside", 8.64e15 + 1)),
      JSON.stringify(entry("negative-outside", -8.64e15 - 1)),
      JSON.stringify(entry("huge", 1e100)),
      JSON.stringify({ ...entry("wrong-type"), createdAtMs: "today" }),
      JSON.stringify({ ...entry("no-text"), text: null }),
      JSON.stringify(valid[1]),
    ].join("\r\n"),
  );
  const result = await loadDictationHistory(paths);
  assert.equal(result.status, "loaded");
  if (result.status !== "loaded") return;
  assert.deepEqual(result.entries, valid.toReversed());
  assert.equal(result.skippedLines, 6);
  for (const item of result.entries)
    assert.doesNotThrow(() => formatDate(item.createdAtMs));
});

test("retains the newest 1,000 entries by date across a large unsorted stream", async (t) => {
  const paths = await fixture(t);
  const entries = Array.from({ length: 5_000 }, (_, i) =>
    entry(String(i), (i * 997) % 5_000),
  );
  await writeFile(
    paths.historyPath,
    entries.map((item) => JSON.stringify(item)).join("\n"),
  );
  const result = await loadDictationHistory(paths);
  assert.equal(result.status, "loaded");
  if (result.status !== "loaded") return;
  assert.deepEqual(
    result.entries.map((item) => item.createdAtMs),
    Array.from({ length: 1_000 }, (_, i) => 4_999 - i),
  );
  assert.equal(result.skippedLines, 0);
});

test("distinguishes missing history, missing home, and read errors", async (t) => {
  const paths = await fixture(t);
  assert.equal((await loadDictationHistory(paths)).status, "history-missing");
  await mkdir(paths.historyPath);
  assert.equal((await loadDictationHistory(paths)).status, "error");
  await rm(paths.codexHome, { recursive: true });
  assert.equal((await loadDictationHistory(paths)).status, "codex-missing");
});

test(
  "refreshes after file creation and atomic replacement, then stops on disposal",
  { timeout: 10_000 },
  async (t) => {
    const paths = await fixture(t);
    const states: LoadState[] = [];
    const stop = watchDictationHistory((state) => states.push(state), paths);
    t.after(stop);

    async function waitFor(predicate: (state: LoadState) => boolean) {
      for (let i = 0; i < 100; i++) {
        const latest = states.at(-1);
        if (latest && predicate(latest)) return;
        await delay(30);
      }
      assert.fail("History did not reach the expected state");
    }

    await waitFor((state) => state.status === "history-missing");
    await writeFile(paths.historyPath, JSON.stringify(entry("first")));
    await waitFor(
      (state) => state.status === "loaded" && state.entries[0]?.id === "first",
    );
    await writeFile(
      paths.historyPath + ".tmp",
      JSON.stringify(entry("replacement", 2)),
    );
    await rename(paths.historyPath + ".tmp", paths.historyPath);
    await waitFor(
      (state) =>
        state.status === "loaded" && state.entries[0]?.id === "replacement",
    );

    stop();
    const count = states.length;
    await writeFile(paths.historyPath, JSON.stringify(entry("after-stop", 3)));
    await delay(1_200);
    assert.equal(states.length, count);
  },
);

test("disposing immediately prevents an in-flight load from publishing", async (t) => {
  const paths = await fixture(t);
  await writeFile(paths.historyPath, JSON.stringify(entry("pending")));
  const states: LoadState[] = [];
  const stop = watchDictationHistory((state) => states.push(state), paths);
  stop();
  await delay(100);
  assert.deepEqual(states, []);
});
