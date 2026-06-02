import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createJiti } from "jiti";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const jiti = createJiti(import.meta.url);
const { getModelOptions, resolveModel } = await jiti.import("../src/models.ts");

function preference(name) {
  const found = manifest.preferences.find((entry) => entry.name === name);
  assert.ok(found, `Missing preference ${name}`);
  return found;
}

test("manifest exposes the active translation providers", () => {
  assert.deepEqual(
    preference("defaultProvider").data.map((entry) => entry.value),
    ["deepseek", "mimo", "gemini", "openai"],
  );
  assert.equal(preference("providerOrder").default, "deepseek,mimo,gemini,openai");
});

test("manifest exposes one default model setting for prompt commands", () => {
  assert.equal(preference("defaultModelTier").title, "Default Model");
  assert.equal(preference("defaultModelTier").default, "fast");
  assert.deepEqual(
    preference("defaultModelTier").data.map((entry) => entry.value),
    ["fast", "pro", "custom"],
  );
});

test("manifest keeps AI Translate focused on translation and capture commands", () => {
  const commandNames = manifest.commands.map((command) => command.name);
  assert.deepEqual(commandNames, [
    "translate",
    "translate-paste",
    "screenshot-translate",
    "screenshot-ocr-copy",
    "screenshot-ocr",
    "history",
    "translation-settings",
  ]);
});

test("MiMo catalog keeps fast and best model choices distinct", () => {
  assert.equal(resolveModel("mimo", "fast", ""), "mimo-v2.5");
  assert.equal(resolveModel("mimo", "pro", ""), "mimo-v2.5-pro");
  assert.deepEqual(
    getModelOptions("mimo").map((entry) => entry.id),
    ["mimo-v2.5-pro", "mimo-v2.5", "mimo-v2-pro", "mimo-v2-flash", "mimo-v2-omni"],
  );
});
