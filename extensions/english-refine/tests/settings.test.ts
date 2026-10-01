import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "vitest";
import { restoreSettings } from "../src/saved-settings";

const model = {
  id: "gpt-6-luna",
  name: "Luna",
  efforts: [{ value: "low" }, { value: "high" }],
  fastTier: "priority" as const,
};

test("exposes a standalone configuration command without requiring selected text", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.title, "Refine");
  const command = manifest.commands.find((command: { name: string }) => command.name === "settings");
  assert.equal(command?.mode, "view");
  assert.equal(command?.arguments, undefined);
  await access(new URL("../src/settings.tsx", import.meta.url));
  assert.equal(manifest.commands.find((command: { name: string }) => command.name === "refine-text")?.mode, "no-view");
});

test("refining requires a saved available model instead of silently choosing another provider model", () => {
  assert.equal(restoreSettings([model], model.id, true).model.id, model.id);
  for (const stored of [undefined, "{bad", JSON.stringify({ modelId: "removed", mode: "fast" })]) {
    assert.throws(() => restoreSettings([model], stored, true), /Refine Settings/);
  }
});

test("restores saved model, effort, and mode against the current discovered capabilities", () => {
  assert.deepEqual(restoreSettings([model], JSON.stringify({ modelId: model.id, effort: "low", mode: "normal" })), {
    model,
    effort: "low",
    mode: "normal",
  });
  assert.equal(
    restoreSettings([model], JSON.stringify({ modelId: model.id, effort: "high", mode: "fast" })).mode,
    "fast",
  );
  const changed = { ...model, efforts: [], fastTier: undefined };
  assert.deepEqual(restoreSettings([changed], JSON.stringify({ modelId: model.id, effort: "low", mode: "fast" })), {
    model: changed,
    effort: "",
    mode: "normal",
  });
});

test("migrates the previous model-only setting and defaults safely when saved settings are stale or malformed", () => {
  assert.deepEqual(restoreSettings([model], model.id), { model, effort: "", mode: "normal" });
  for (const stored of [
    undefined,
    "",
    "{bad",
    "null",
    "[]",
    "42",
    JSON.stringify({ modelId: "removed", effort: "high", mode: "fast" }),
  ]) {
    assert.deepEqual(restoreSettings([model], stored), { model, effort: "", mode: "normal" });
  }
});
