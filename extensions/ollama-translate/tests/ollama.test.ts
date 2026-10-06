import assert from "node:assert/strict";
import { test } from "node:test";
import { filterLocalModels, parseTranslationResult } from "../src/lib/ollama";

test("excludes cloud tags and remote-backed models from the local picker", () => {
  const names = filterLocalModels([
    { name: "gemma4:e4b-mlx", model: "gemma4:e4b-mlx", size: 9000 },
    { name: "gemma4:31b-cloud", model: "gemma4:31b-cloud", size: 312 },
    { name: "nemotron:cloud", model: "nemotron:cloud", size: 310 },
    {
      name: "remote-alias",
      model: "remote-alias",
      size: 9000,
      remote_model: "gemma4:31b",
    },
    {
      name: "remote-host-alias",
      model: "remote-host-alias",
      size: 9000,
      remote_host: "https://ollama.com",
    },
  ]).map((model) => model.name);
  assert.deepEqual(names, ["gemma4:e4b-mlx"]);
});

test("accepts structured translations and normalizes the language code", () => {
  assert.deepEqual(
    parseTranslationResult(
      '```json\n{"translation":" Bonjour ","detectedLanguageCode":"EN","semanticBrief":"greeting"}\n```',
    ),
    { translation: "Bonjour", detectedLanguageCode: "en" },
  );
});

test("preserves supported aliases and plain-text model responses", () => {
  assert.equal(
    parseTranslationResult('{"final_translation":"Bonjour"}').translation,
    "Bonjour",
  );
  assert.deepEqual(parseTranslationResult(" Bonjour ! "), {
    translation: "Bonjour !",
    detectedLanguageCode: "",
  });
});

for (const response of [
  '{"translation":"","semanticBrief":"analysis"}',
  '{"semanticBrief":"analysis"}',
  '{"translation":"   "}',
  '{"translation":null}',
  '{"translation":42}',
  '{"translation":{"text":"Bonjour"}}',
  '{"translation":["Bonjour"]}',
  "{}",
  "[]",
  "null",
  "true",
  "42",
  '"Bonjour"',
  '{"translation":"Bonjour"',
  '[{"translation":"Bonjour"}',
  '```json\n{"translation":""}\n```',
  "```json\ninvalid JSON\n```",
  "",
  "   ",
]) {
  test(`rejects invalid structured or empty output: ${JSON.stringify(response)}`, () => {
    assert.throws(
      () => parseTranslationResult(response),
      /The model returned an invalid translation/,
    );
  });
}
