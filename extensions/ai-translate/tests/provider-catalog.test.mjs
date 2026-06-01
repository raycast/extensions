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

test("manifest exposes MiniMax as a translation provider", () => {
  assert.deepEqual(
    preference("defaultProvider").data.map((entry) => entry.value),
    ["deepseek", "minimax", "mimo", "gemini", "openai"],
  );
  assert.equal(preference("enableMiniMax").default, false);
  assert.equal(preference("providerOrder").default, "deepseek,minimax,mimo,gemini,openai");
  assert.equal(preference("minimaxBaseURL").default, "https://api.minimaxi.com/anthropic");
  assert.equal(preference("minimaxModel").default, "MiniMax-M3");
});

test("MiniMax catalog defaults to M3 and keeps M2.7 as an explicit text-model choice", () => {
  assert.equal(resolveModel("minimax", "fast", ""), "MiniMax-M3");
  assert.equal(resolveModel("minimax", "pro", ""), "MiniMax-M3");
  assert.deepEqual(
    getModelOptions("minimax").map((entry) => entry.id),
    ["MiniMax-M3", "MiniMax-M2.7-highspeed"],
  );
});
