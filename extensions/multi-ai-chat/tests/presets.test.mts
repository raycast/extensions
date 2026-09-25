import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPresetDeeplink,
  canRunPresetImmediately,
  deletedPresetStorageKey,
  deserializeLegacyPresets,
  deserializePreset,
  deserializePresets,
  extractTemplateArguments,
  getTemplateArgumentValue,
  presetStorageKey,
  renderPromptTemplate,
} from "../src/lib/presets.ts";

const preset = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Recent X Posts",
  template: "Topic: {topic}",
  serviceCounts: { chatgpt: 0, claude: 1, grok: 2, perplexity: 5 },
};

test("extracts unique named arguments in first-seen order", () => {
  assert.deepEqual(
    extractTemplateArguments(
      "Find {topic} in {language}, compare {topic}, then explain {nível_2}.",
    ),
    ["topic", "language", "nível_2"],
  );
});

test("ignores braces that are not named argument placeholders", () => {
  assert.deepEqual(
    extractTemplateArguments('JSON: {"key": 1}; empty {}; numeric {123}'),
    [],
  );
});

test("runs immediately only when a preset needs no argument values", () => {
  assert.equal(
    canRunPresetImmediately({ template: "Summarize today's news" }),
    true,
  );
  assert.equal(
    canRunPresetImmediately({ template: 'Return JSON: {"short": true}' }),
    true,
  );
  assert.equal(
    canRunPresetImmediately({ template: "Summarize {topic}" }),
    false,
  );
});

test("renders every occurrence without changing whitespace or unicode", () => {
  const template = "Topic: {topic}\nAgain: {topic}\nLanguage: {idioma}";
  assert.equal(
    renderPromptTemplate(template, {
      topic: "AI & society 👋",
      idioma: "Português",
    }),
    "Topic: AI & society 👋\nAgain: AI & society 👋\nLanguage: Português",
  );
});

test("rejects rendering when a named argument has no value", () => {
  assert.throws(
    () => renderPromptTemplate("Topic: {topic}", {}),
    /Missing value for \{topic\}/,
  );
});

test("prototype-named placeholders require own string values", () => {
  for (const argument of ["constructor", "toString", "__proto__"]) {
    assert.equal(getTemplateArgumentValue({}, argument), undefined);
    assert.throws(
      () => renderPromptTemplate(`Value: {${argument}}`, {}),
      new RegExp(`Missing value for \\{${argument}\\}`),
    );
  }

  const values = Object.create(null) as Record<string, string>;
  values.constructor = "own constructor";
  values.toString = "own toString";
  values.__proto__ = "own proto";
  assert.equal(
    renderPromptTemplate("{constructor}; {toString}; {__proto__}", values),
    "own constructor; own toString; own proto",
  );

  assert.equal(
    getTemplateArgumentValue(
      { constructor: (() => "not a string") as unknown as string },
      "constructor",
    ),
    undefined,
  );
});

test("deserializes a dynamic preset collection and preserves order", () => {
  assert.deepEqual(
    deserializePresets(
      JSON.stringify([
        { ...preset, name: "  Recent X Posts  " },
        { ...preset, id: "second-id", name: "Second" },
      ]),
    ),
    [preset, { ...preset, id: "second-id", name: "Second" }],
  );
});

test("drops duplicate IDs so direct links stay unambiguous", () => {
  assert.deepEqual(
    deserializePresets(
      JSON.stringify([preset, { ...preset, name: "Duplicate" }]),
    ),
    [preset],
  );
});

test("accepts only fully valid legacy collections for lossless migration", () => {
  assert.deepEqual(deserializeLegacyPresets(JSON.stringify([preset])), [
    preset,
  ]);
  assert.deepEqual(deserializeLegacyPresets(JSON.stringify([])), []);
  assert.equal(deserializeLegacyPresets("not json"), undefined);
  assert.equal(deserializeLegacyPresets(JSON.stringify({ preset })), undefined);
  assert.equal(
    deserializeLegacyPresets(JSON.stringify([preset, { ...preset }])),
    undefined,
  );
  assert.equal(
    deserializeLegacyPresets(
      JSON.stringify([{ ...preset, serviceCounts: { chatgpt: 1 } }]),
    ),
    undefined,
  );
});

test("deserializes one ID-scoped preset without accepting collection data", () => {
  assert.deepEqual(deserializePreset(JSON.stringify(preset)), preset);
  assert.equal(deserializePreset(JSON.stringify([preset])), undefined);
  assert.equal(deserializePreset("not json"), undefined);
});

test("uses independent preset and deletion keys for each UUID", () => {
  assert.equal(presetStorageKey(preset.id), `prompt-preset:${preset.id}`);
  assert.equal(
    deletedPresetStorageKey(preset.id),
    `deleted-prompt-preset:${preset.id}`,
  );
  assert.notEqual(presetStorageKey("first"), presetStorageKey("second"));
  assert.notEqual(
    presetStorageKey(preset.id),
    deletedPresetStorageKey(preset.id),
  );
});

test("disables malformed service counts instead of opening unexpected tabs", () => {
  assert.deepEqual(
    deserializePresets(
      JSON.stringify([
        {
          ...preset,
          serviceCounts: {
            chatgpt: 6,
            claude: -1,
            grok: 1.5,
            perplexity: "2",
          },
        },
      ]),
    )[0]?.serviceCounts,
    { chatgpt: 0, claude: 0, grok: 0, perplexity: 0 },
  );
});

test("skips invalid collection entries and rejects corrupt storage", () => {
  assert.deepEqual(
    deserializePresets(
      JSON.stringify([preset, { name: "No ID", template: "Hello" }, null]),
    ),
    [preset],
  );
  assert.deepEqual(deserializePresets("not json"), []);
  assert.deepEqual(deserializePresets(JSON.stringify({ preset })), []);
  assert.deepEqual(deserializePresets(42), []);
});

test("builds a direct Raycast deeplink with encoded launch context", () => {
  const deeplink = buildPresetDeeplink("author", "multi-ai-chat", preset.id);
  const url = new URL(deeplink);
  assert.equal(
    `${url.protocol}//${url.host}${url.pathname}`,
    "raycast://extensions/author/multi-ai-chat/run-presets",
  );
  assert.deepEqual(JSON.parse(url.searchParams.get("context") ?? ""), {
    presetId: preset.id,
  });
});
