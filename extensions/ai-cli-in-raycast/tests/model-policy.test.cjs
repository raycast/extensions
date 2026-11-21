require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseModelPolicy,
  storageKeys,
  modelPolicyPreference,
  resolveModelPolicy,
} = require("../src/session-storage.ts");

test("only an absent policy defaults to last while broken stored policies fail closed", () => {
  for (const raw of [undefined, null, "", "  "])
    assert.deepEqual(parseModelPolicy(raw), { mode: "last", selection: null });
  assert.deepEqual(
    parseModelPolicy(
      '{"mode":"last","selection":{"model":"ignored","effort":"high"}}',
    ),
    { mode: "last", selection: null },
  );
  for (const raw of [
    "bad JSON",
    '{"mode":"fixed",',
    "null",
    "{}",
    '{"mode":"future"}',
    '{"mode":"fixed","selection":null}',
    '{"mode":"fixed","selection":{"model":"A"}}',
    '{"mode":"fixed","selection":{"model":" ","effort":"low"}}',
  ])
    assert.deepEqual(parseModelPolicy(raw), { mode: "fixed", selection: null });
});

test("fixed policies preserve explicit empty effort and opaque model identifiers", () => {
  for (const selection of [
    { model: "__cli_default__", effort: "" },
    { model: "provider/model:exact", effort: "future-level" },
  ])
    assert.deepEqual(
      parseModelPolicy(JSON.stringify({ mode: "fixed", selection })),
      { mode: "fixed", selection },
    );
});

test("provider policy storage is isolated from recent selections and preserves legacy Codex keys", () => {
  const providers = [
    "codex",
    "antigravity",
    "qoder",
    "qoder-cn",
    "workbuddy",
    "gemini",
  ];
  const policyKeys = providers.map(
    (provider) => storageKeys(provider).modelPolicy,
  );
  assert.equal(new Set(policyKeys).size, providers.length);
  for (const provider of providers)
    assert.notEqual(
      storageKeys(provider).modelPolicy,
      storageKeys(provider).model,
    );
  assert.equal(storageKeys("codex").model, "ask-chatgpt.model-selection.v1");
  assert.equal(storageKeys("codex").setup, "codex-in-raycast.setup.v1");
});

test("native strategy fields exist for all six CLIs and offer only last or fixed", () => {
  const manifest = require("../package.json");
  for (const [provider, key] of [
    ["codex", "codexModelStrategy"],
    ["antigravity", "agyModelStrategy"],
    ["qoder", "qoderModelStrategy"],
    ["qoder-cn", "qoderCnModelStrategy"],
    ["workbuddy", "workbuddyModelStrategy"],
    ["gemini", "geminiModelStrategy"],
  ]) {
    assert.equal(modelPolicyPreference(provider), key);
    const preference = manifest.preferences.find((entry) => entry.name === key);
    assert.equal(preference.type, "dropdown");
    assert.equal(preference.default, "last");
    assert.deepEqual(
      preference.data.map((entry) => entry.value),
      ["last", "fixed"],
    );
    const raw = JSON.stringify({
      mode: "fixed",
      selection: { model: provider + "/model", effort: "high" },
    });
    assert.deepEqual(resolveModelPolicy(raw, provider, { [key]: "last" }), {
      mode: "last",
      selection: { model: provider + "/model", effort: "high" },
    });
    assert.deepEqual(resolveModelPolicy(raw, provider, { [key]: "fixed" }), {
      mode: "fixed",
      selection: { model: provider + "/model", effort: "high" },
    });
  }
});

test("native fixed needs its own saved pair while legacy callers retain stored strategy", () => {
  const raw = JSON.stringify({
    mode: "fixed",
    selection: { model: "A", effort: "low" },
  });
  assert.deepEqual(resolveModelPolicy(raw, "codex", {}), parseModelPolicy(raw));
  assert.deepEqual(
    resolveModelPolicy(undefined, "codex", { codexModelStrategy: "fixed" }),
    { mode: "fixed", selection: null },
  );
  assert.deepEqual(
    resolveModelPolicy("broken", "codex", { codexModelStrategy: "last" }),
    { mode: "last", selection: null },
  );
  assert.deepEqual(
    resolveModelPolicy(raw, "codex", { agyModelStrategy: "last" }),
    parseModelPolicy(raw),
  );
});
