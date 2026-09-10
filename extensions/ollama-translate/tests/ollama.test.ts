import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTranslationResult } from "../src/lib/ollama";

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
