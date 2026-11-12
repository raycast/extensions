import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { checkSetup, searchArtifacts, searchOptions } from "../src/services/ai-search";
import { decodeScanSettings, parseScanSettings } from "../src/services/scan-settings";
import { scan } from "../src/services/scan-manager";
import { Artifact, ScanOptions } from "../src/types";

const saved: ScanOptions = {
  root: "/Projects",
  profiles: "node,python",
  executable: "/usr/local/bin/npkill",
  config: "/Projects/.npkillrc",
  exclusions: "keep",
  includeSensitive: false,
};
const artifact = (name: string, size: number | null, age: number | null): Artifact => ({
  path: `/Projects/${name}/node_modules`,
  size,
  activity: age === null ? null : Date.now() - age * 86400000,
  risk: "review",
  identity: [{ path: "/Projects", dev: 1, ino: 2, birthtimeMs: 1 }],
});
function runner(items: Artifact[]): typeof scan {
  return async (_options, _signal, callbacks) => {
    callbacks.onRoot({ path: "/Projects", identity: [] });
    for (const item of items) callbacks.onArtifact(item);
    return "complete";
  };
}

test("AI and UI read the same settings while dropping unrelated stored fields", () => {
  const stored = { ...saved, directoryPicker: ["/unrelated"] };
  assert.deepEqual(parseScanSettings(stored), saved);
  assert.deepEqual(decodeScanSettings(JSON.stringify(stored)), saved);
  assert.equal(parseScanSettings(undefined), undefined);
  assert.throws(() => parseScanSettings({ root: "/" }), /invalid/);
  assert.throws(() => decodeScanSettings("broken JSON"));
  assert.deepEqual(searchOptions({}, saved), saved);
  const changed = searchOptions({ directory: "~/Developer", profiles: "rust" }, saved);
  assert.equal(changed.root, "~/Developer");
  assert.equal(changed.profiles, "rust");
  assert.equal(changed.config, saved.config);
  assert.equal(changed.exclusions, saved.exclusions);
  assert.equal(changed.includeSensitive, false);
  assert.equal(changed.executable, saved.executable);
  assert.throws(() => searchOptions({}), /No scan root is assumed/);
});

test("AI filters combine size, age, and query without treating unknowns as old", async () => {
  const report = await searchArtifacts({ query: "ARCHIVE", minimumSizeBytes: 1024, minimumInactiveDays: 90 }, saved, {
    run: runner([
      artifact("archive", 2048, 100),
      artifact("archive-unknown-age", 4096, null),
      artifact("archive-unknown-size", null, 100),
      artifact("archive-active", 8192, 1),
      artifact("other", 8192, 100),
    ]),
  });
  assert.equal(report.scanComplete, true);
  assert.equal(report.scannedCount, 5);
  assert.equal(report.matchingCount, 1);
  assert.equal(report.results[0].path, "/Projects/archive/node_modules");
  assert.equal(report.matchingEstimatedBytes, 2048);
});

test("AI output is cloneable, excludes filesystem identities, and distinguishes output limits from incomplete scans", async () => {
  const item = Object.assign(artifact("largest", 100, null), { transport: () => {} });
  const report = await searchArtifacts({ limit: 1 }, saved, { run: runner([item, artifact("small", 1, 5)]) });
  assert.deepEqual(structuredClone(report), report);
  assert.equal(report.scanComplete, true);
  assert.equal(report.resultsTruncated, true);
  assert.equal(report.matchingCount, 2);
  assert.equal(report.returnedCount, 1);
  assert.equal(report.matchingEstimatedBytes, 101);
  assert.equal(report.results[0].projectModificationTime, null);
  assert.equal(report.results[0].inactiveDays, null);
  assert.ok(!("identity" in report.results[0]));
  assert.ok(!("transport" in report.results[0]));
});

test("AI invalid limits and filters fail before launching a scan", async () => {
  for (const input of [
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { minimumSizeBytes: NaN },
    { minimumInactiveDays: -1 },
    { minimumSizeBytes: Infinity },
  ]) {
    await assert.rejects(
      searchArtifacts(input, saved, {
        run: async () => {
          assert.fail("must not run");
        },
      }),
    );
  }
});

test("AI time limit terminates scanning and retains partial results", async () => {
  let aborted = false;
  const run: typeof scan = async (_options, signal, callbacks) => {
    callbacks.onArtifact(artifact("partial", 50, 50));
    await new Promise<void>((resolve) =>
      signal.addEventListener(
        "abort",
        () => {
          aborted = true;
          resolve();
        },
        { once: true },
      ),
    );
    return "canceled";
  };
  const report = await searchArtifacts({}, saved, { run, timeoutMs: 10 });
  assert.equal(aborted, true);
  assert.equal(report.scanComplete, false);
  assert.equal(report.stopReason, "time-limit");
  assert.equal(report.returnedCount, 1);
});

test("AI discovery cap stops accumulation and reports a partial scan independently of result truncation", async () => {
  const report = await searchArtifacts({}, saved, {
    run: runner([artifact("one", 1, 1), artifact("two", 2, 2), artifact("three", 3, 3)]),
    maxCandidates: 2,
  });
  assert.equal(report.scannedCount, 2);
  assert.equal(report.scanComplete, false);
  assert.equal(report.stopReason, "candidate-limit");
  assert.equal(report.resultsTruncated, false);
});

test("AI errors and permission notices cannot look like complete empty results", async () => {
  const failed = await searchArtifacts({}, saved, {
    run: async () => {
      throw new Error("Permission denied");
    },
  });
  assert.equal(failed.scanComplete, false);
  assert.equal(failed.stopReason, "failed");
  assert.equal(failed.error, "Permission denied");
  assert.equal(failed.returnedCount, 0);
  const warnings = await searchArtifacts({}, saved, {
    run: async (_options, _signal, callbacks) => {
      for (let i = 0; i < 30; i++) callbacks.onWarning("Skipped unreadable directory");
      return "complete";
    },
  });
  assert.equal(warnings.scanComplete, false);
  assert.equal(warnings.warningCount, 30);
  assert.equal(warnings.warnings.length, 20);
});

test("AI search and setup work with real npkill without deleting fixture contents", async (t) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "npkill-ai-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "demo", "node_modules");
  await mkdir(target, { recursive: true });
  const file = join(target, "fixture.txt");
  await writeFile(file, "disposable fixture");
  await writeFile(join(root, "demo", "package.json"), "{}");
  const options = {
    ...saved,
    root,
    executable: resolve("node_modules/.bin/npkill"),
    profiles: "node",
    config: "",
    exclusions: "",
  };
  const setup = await checkSetup(options);
  assert.equal(setup.ready, true, setup.problems.join("\n"));
  assert.equal(setup.cliCompatible, true);
  const missingRoot = await checkSetup({ ...options, root: join(root, "missing") });
  assert.equal(missingRoot.ready, false);
  assert.equal(missingRoot.cliCompatible, true);
  const report = await searchArtifacts({}, options);
  assert.equal(report.scanComplete, true, report.error ?? report.warnings.join("\n"));
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].path, target);
  await access(file);
});
