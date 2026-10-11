import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { diskOverview, growthOverview, memoryOverview, readStatus } from "../src/mint-ai.ts";
import type { MemoryScan } from "../src/mint-panes.ts";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("the disk answer is the menu bar's: used and free now, the four groups of the last Scan", () => {
  const answer = diskOverview({
    volume: { totalBytes: 494_384_795_648, freeBytes: 40_031_913_997 },
    groups: {
      optimizableBytes: 6_200_000_000,
      safeToCleanBytes: 18_400_000_000,
      yoursBytes: 26_956_733_960,
      keepBytes: 402_800_000_000,
      scannedAt: "2026-10-04T22:42:00Z",
    },
  });
  assert.equal(answer.disk?.used, "454.35 GB");
  assert.equal(answer.disk?.free, "40.03 GB");
  assert.deepEqual(
    answer.groups.map((group) => [group.name, group.size]),
    [
      ["Optimizable", "6.2 GB"],
      ["Safe to clean", "18.4 GB"],
      ["Yours", "26.96 GB"],
      ["Keep", "402.8 GB"],
    ],
  );
  assert.equal(answer.lastScan, "2026-10-04T22:42:00Z");
});

test("an older CLI without groups answers from the file Mint saved after its Scan, its GB read as GiB", () => {
  const answer = diskOverview({ disk: { totalGB: 460.43, freeGB: 37.28 } }, { optimizableBytes: 1_000_000_000 });
  assert.equal(answer.groups[0].size, "1 GB");
  assert.equal(answer.disk?.total, "494.38 GB");
  assert.equal(answer.disk?.used, "454.35 GB");
});

test("a full disk's 0 bytes free is still a size", () => {
  assert.equal(diskOverview({ disk: { totalGB: 460.43, freeGB: 0 } }).disk?.free, "0 B");
  assert.equal(diskOverview({ volume: { totalBytes: 494_384_795_648, freeBytes: 0 } }).disk?.used, "494.38 GB");
});

test("a failed status read says Mint did not answer, never that it has not scanned", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mint-ai-"));
  const cli = join(dir, "mint-cli");
  writeFileSync(cli, "#!/bin/sh\necho 'database is locked' >&2\nexit 1\n");
  chmodSync(cli, 0o755);
  await assert.rejects(readStatus(cli), /Mint did not report the disk \(database is locked\)/);
  rmSync(dir, { recursive: true, force: true });
});

test("a Mac Mint never scanned says so instead of reporting empty groups", () => {
  const answer = diskOverview(undefined, undefined);
  assert.equal(answer.groups.length, 0);
  assert.equal(answer.disk, undefined);
  assert.match(answer.note, /has not scanned/);
});

test("memory piles are sized by what quitting gives back, never above what is in use", () => {
  const app = (id: string, bytes: number, extra: Record<string, unknown> = {}) => ({
    id,
    name: id,
    bytes,
    processCount: 1,
    selectable: true,
    advanced: false,
    needsReview: false,
    defaultSelected: false,
    ...extra,
  });
  const scan: MemoryScan = {
    sessionID: "s",
    detailsUnavailable: false,
    usedBytes: 4_000_000_000,
    totalBytes: 16_000_000_000,
    items: [
      app("Chrome", 3_000_000_000, { defaultSelected: true }),
      app("Xcode", 3_000_000_000),
      app("macOS", 1, { selectable: false }),
    ],
  };
  const answer = memoryOverview(scan);
  assert.equal(answer.used, "4 GB");
  assert.deepEqual(
    answer.piles.map((pile) => [pile.name, pile.size, pile.apps.map((a) => a.name)]),
    [
      ["Idle", "2 GB", ["Chrome"]],
      ["In use", "2 GB", ["Xcode"]],
    ],
  );
});

test("growth needs two maps, and states only what grew", () => {
  assert.equal(growthOverview([{ date: "2026-10-05T00:00:00Z" }]).grew?.length, 0);
  const answer = growthOverview([
    {
      date: "2026-09-28T00:00:00Z",
      usedBytes: 400e9,
      sources: { huggingface: 1.2e9, Mint: 900e6 },
      categories: { developer: 100e9 },
    },
    {
      date: "2026-10-05T00:00:00Z",
      usedBytes: 421e9,
      sources: { huggingface: 5.8e9, Mint: 880e6, fresh: 2e9 },
      categories: { developer: 112e9 },
    },
  ]);
  assert.equal(answer.usedChange, "+21 GB");
  assert.deepEqual(
    answer.grewByAppOrFolder?.map((row) => [row.name, row.grewBy]),
    [["huggingface", "4.6 GB"]],
  );
  assert.deepEqual(
    answer.grewByCategory?.map((row) => [row.name, row.grewBy]),
    [["Developer", "12 GB"]],
  );
});

test("every AI tool has its entry point, and every eval calls a tool that exists", () => {
  const names = manifest.tools.map((tool: { name: string }) => tool.name);
  for (const name of names) {
    assert.ok(existsSync(new URL(`../src/tools/${name}.ts`, import.meta.url)), `src/tools/${name}.ts`);
  }
  for (const evaluation of manifest.ai.evals) {
    assert.match(evaluation.input, /^@mint /);
    for (const expected of evaluation.expected ?? []) assert.ok(names.includes(expected.callsTool), expected.callsTool);
  }
});

test("keywords fit the Store's limits: at most 12 a list, 25 characters each, no repeats", () => {
  const lists = [
    manifest.keywords,
    ...manifest.commands.map((command: { keywords?: string[] }) => command.keywords ?? []),
  ];
  for (const list of lists) {
    assert.ok(list.length <= 12);
    assert.equal(new Set(list).size, list.length);
    for (const keyword of list) assert.ok(keyword.length <= 25 && !/[,\r\n\t]/.test(keyword), keyword);
  }
});
