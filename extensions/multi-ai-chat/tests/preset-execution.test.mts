import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { PromptPreset } from "../src/lib/presets.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(".js") && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { preparePresetExecution } =
  await import("../src/lib/preset-execution.ts");

const visiblePreset: PromptPreset = {
  id: "preset-id",
  name: "Visible preset",
  template: "Explain {topic}",
  serviceCounts: { chatgpt: 0, claude: 1, grok: 0, perplexity: 0 },
};

test("rejects execution and returns the latest preset when storage changed", async () => {
  const storedPreset: PromptPreset = {
    ...visiblePreset,
    template: "Explain {topic} in {language}",
    serviceCounts: { chatgpt: 0, claude: 0, grok: 5, perplexity: 0 },
  };
  let requestedId: string | undefined;

  const prepared = await preparePresetExecution(
    visiblePreset,
    { topic: "AI" },
    async (id) => {
      requestedId = id;
      return storedPreset;
    },
  );

  assert.equal(requestedId, visiblePreset.id);
  assert.deepEqual(prepared, { status: "changed", preset: storedPreset });
});

test("prepares requests when the displayed and stored revisions match", async () => {
  const prepared = await preparePresetExecution(
    visiblePreset,
    { topic: "AI" },
    async () => visiblePreset,
  );

  assert.equal(prepared.status, "ready");
  if (prepared.status !== "ready") return;

  assert.equal(prepared.requests.length, 1);
  assert.equal(prepared.requests[0].service.id, "claude");
  assert.equal(new URL(prepared.requests[0].url).searchParams.get("q"), "Explain AI");
});

test("rejects execution when the authoritative lookup reports a deletion", async () => {
  const prepared = await preparePresetExecution(
    visiblePreset,
    { topic: "AI" },
    async () => undefined,
  );

  assert.deepEqual(prepared, { status: "missing" });
});
