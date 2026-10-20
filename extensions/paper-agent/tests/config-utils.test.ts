import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test, type TestContext } from "node:test";
import {
  applyPaperDirOverride,
  readConfigObject,
  resolveDeliveryDirs,
  withEffectiveConfigPathAsync,
} from "../src/config-utils";

function configFixture(t: TestContext, content = "delivery:\n  paper_dir: /original\n  library_dir: /custom\n") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "paper-agent-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const configPath = path.join(directory, "config.yaml");
  fs.writeFileSync(configPath, content);
  return configPath;
}

test("a paper directory override preserves unrelated settings and the original object", () => {
  const original = { delivery: { paper_dir: "/original", library_dir: "/custom" }, summarize: { enabled: false } };
  const merged = applyPaperDirOverride(original, " /selected ");
  assert.deepEqual(merged, {
    delivery: { paper_dir: "/selected", library_dir: path.join("/selected", "library") },
    summarize: { enabled: false },
  });
  assert.equal(original.delivery.paper_dir, "/original");
  assert.equal(original.delivery.library_dir, "/custom");
});

test("explicit preferences override YAML while an unset preference preserves a custom library", (t) => {
  const configPath = configFixture(t);
  assert.deepEqual(resolveDeliveryDirs(configPath, ""), { paperDir: "/original", libraryDir: "/custom" });
  assert.deepEqual(resolveDeliveryDirs(configPath, " /selected "), {
    paperDir: "/selected",
    libraryDir: path.join("/selected", "library"),
  });
});

test("the temporary configuration remains available throughout an asynchronous run", async (t) => {
  const configPath = configFixture(t);
  const original = fs.readFileSync(configPath, "utf8");
  let temporary = "";
  const result = await withEffectiveConfigPathAsync(configPath, "/selected", async (effectivePath) => {
    temporary = effectivePath;
    await Promise.resolve();
    assert.deepEqual(readConfigObject(effectivePath), {
      delivery: { paper_dir: "/selected", library_dir: path.join("/selected", "library") },
    });
    return "complete";
  });
  assert.equal(result, "complete");
  assert.equal(fs.existsSync(temporary), false);
  assert.equal(fs.readFileSync(configPath, "utf8"), original);
});

test("a failed run removes its temporary configuration and preserves the original failure", async (t) => {
  const configPath = configFixture(t);
  const failure = new Error("core failed");
  let temporary = "";
  await assert.rejects(
    withEffectiveConfigPathAsync(configPath, "/selected", async (effectivePath) => {
      temporary = effectivePath;
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.ok(temporary);
  assert.equal(fs.existsSync(temporary), false);
  assert.ok(fs.existsSync(configPath));
});

test("invalid YAML is rejected before invoking the core", async (t) => {
  const configPath = configFixture(t, "delivery: [unterminated\n");
  let called = false;
  await assert.rejects(
    withEffectiveConfigPathAsync(configPath, "/selected", async () => {
      called = true;
    }),
    /missing or invalid/,
  );
  assert.equal(called, false);
});

test("an absent paper directory is rejected without invoking the core", async (t) => {
  const configPath = configFixture(t);
  let called = false;
  await assert.rejects(
    withEffectiveConfigPathAsync(configPath, " ", async () => {
      called = true;
    }),
    /Paper directory is required/,
  );
  assert.equal(called, false);
});
