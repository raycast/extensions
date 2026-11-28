import assert from "node:assert/strict";
import test from "node:test";
import {
  builtInTools,
  completionUrl,
  deleteFromRegistry,
  mergeTools,
  renderPrompt,
  saveToRegistry,
  toolDeeplink,
} from "../src/lib/tools";

test("saved built-ins override defaults without losing custom tools", () => {
  const changed = { ...builtInTools[0], prompt: "Be brief." };
  const custom = { id: "new-tool", title: "Summary", prompt: "Summarize." };
  const merged = mergeTools([changed, custom]);
  assert.equal(merged.length, 5);
  assert.equal(merged[0].prompt, "Be brief.");
  assert.equal(merged[4].id, custom.id);
  assert.equal(mergeTools([])[0].prompt, builtInTools[0].prompt);
});

test("deleting built-ins persists through reload without losing their custom settings", () => {
  const changed = { ...builtInTools[0], prompt: "Keep my customized prompt." };
  const custom = { id: "summary", title: "Summary", prompt: "Summarize." };
  const registry = { tools: [changed, custom], deletedBuiltIns: [] };
  const deleted = JSON.parse(
    JSON.stringify(deleteFromRegistry(registry, changed.id)),
  );
  const active = mergeTools(deleted.tools, deleted.deletedBuiltIns);
  assert.equal(
    active.some((tool) => tool.id === changed.id),
    false,
  );
  assert.deepEqual(
    active.find((tool) => tool.id === custom.id),
    custom,
  );
  assert.equal(deleted.tools[0].prompt, changed.prompt);
  const restored = saveToRegistry(deleted, changed);
  assert.equal(
    mergeTools(restored.tools, restored.deletedBuiltIns)[0].prompt,
    changed.prompt,
  );
  assert.deepEqual(deleteFromRegistry(deleted, changed.id), deleted);
});

test("saving another command never resurrects deleted built-ins; deleting custom commands removes them", () => {
  const custom = { id: "summary", title: "Summary", prompt: "Summarize." };
  const registry = deleteFromRegistry(
    { tools: [custom], deletedBuiltIns: [] },
    "dictionary",
  );
  const edited = saveToRegistry(registry, { ...custom, prompt: "Be brief." });
  assert.equal(
    mergeTools(edited.tools, edited.deletedBuiltIns).some(
      (tool) => tool.id === "dictionary",
    ),
    false,
  );
  const deleted = deleteFromRegistry(edited, custom.id);
  assert.deepEqual(deleted.tools, []);
  assert.deepEqual(deleted.deletedBuiltIns, ["dictionary"]);
});
test("custom shortcut deeplinks encode arguments and built-ins have direct links", () => {
  const custom = { id: "custom id", title: "Summary", prompt: "Summarize." };
  const link = new URL(toolDeeplink(custom));
  assert.deepEqual(JSON.parse(link.searchParams.get("arguments")!), {
    tool: "custom id",
  });
  assert.equal(link.pathname, "/edliu_microsoft/mae-ai/custom-tool");
  assert.equal(
    new URL(toolDeeplink(builtInTools[0])).pathname,
    "/edliu_microsoft/mae-ai/ask-ai",
  );
});

test("provider URLs retain their prefix, normalize trailing slashes, and reject credentials", () => {
  assert.equal(
    completionUrl(" http://127.0.0.1:23333/api/openai/v1/// "),
    "http://127.0.0.1:23333/api/openai/v1/chat/completions",
  );
  assert.equal(
    completionUrl("https://example.com/v1"),
    "https://example.com/v1/chat/completions",
  );
  assert.equal(
    completionUrl("https://example.com/v1/chat/completions/"),
    "https://example.com/v1/chat/completions",
  );
  assert.equal(
    completionUrl("https://example.com"),
    "https://example.com/v1/chat/completions",
  );
  assert.throws(() => completionUrl("file:///C:/secret"));
  assert.throws(() => completionUrl("https://user:password@example.com"));
  assert.throws(() => completionUrl("https://example.com/v1?key=secret"));
});

test("translation language placeholders are replaced without interpreting user text", () => {
  assert.equal(
    renderPrompt("Use {{language}}; repeat {{language}}.", "Chinese"),
    "Use Chinese; repeat Chinese.",
  );
});
