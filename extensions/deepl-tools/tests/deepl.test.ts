import assert from "node:assert/strict";
import test from "node:test";
import { translate } from "../src/deepl";
import { AppPreferences } from "../src/preferences";

const preferences: AppPreferences = {
  apiKey: "test-key",
  primaryLanguage: "RU",
  secondaryLanguage: "EN-US",
};

function deepLResponse(sourceLanguage: string, text: string) {
  return new Response(JSON.stringify({ translations: [{ detected_source_language: sourceLanguage, text }] }), {
    status: 200,
  });
}

test("uses one request when short text is already in the secondary language", async (context) => {
  const requests: URLSearchParams[] = [];
  context.mock.method(globalThis, "fetch", async (_input, init) => {
    requests.push(init?.body as URLSearchParams);
    return deepLResponse("EN", "Привет");
  });

  const result = await translate("Hello", preferences);

  assert.equal(result.translatedText, "Привет");
  assert.equal(result.targetLang, "RU");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].get("target_lang"), "RU");
});

test("retries toward the secondary language when DeepL detects short primary-language text", async (context) => {
  const requests: URLSearchParams[] = [];
  context.mock.method(globalThis, "fetch", async (_input, init) => {
    requests.push(init?.body as URLSearchParams);
    return requests.length === 1 ? deepLResponse("RU", "Привет") : deepLResponse("RU", "Hello");
  });

  const result = await translate("Привет", preferences);

  assert.equal(result.translatedText, "Hello");
  assert.equal(result.targetLang, "EN-US");
  assert.deepEqual(
    requests.map((body) => body.get("target_lang")),
    ["RU", "EN-US"],
  );
  assert.equal(requests[1].get("source_lang"), "RU");
});

test("constrains ambiguous short text to the configured language pair", async (context) => {
  const requests: URLSearchParams[] = [];
  context.mock.method(globalThis, "fetch", async (_input, init) => {
    requests.push(init?.body as URLSearchParams);
    return requests.length === 1 ? deepLResponse("DA", "однако") : deepLResponse("EN", "собака");
  });

  const result = await translate("dog", preferences);

  assert.equal(result.translatedText, "собака");
  assert.equal(result.targetLang, "RU");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].get("source_lang"), "EN");
});

test("uses the API Free endpoint and sends the key in the authorization header", async (context) => {
  let requestedUrl = "";
  let authorization = "";
  context.mock.method(globalThis, "fetch", async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("Authorization") || "";
    return deepLResponse("EN", "Привет");
  });

  await translate("Hello", preferences);

  assert.equal(requestedUrl, "https://api-free.deepl.com/v2/translate");
  assert.equal(authorization, "DeepL-Auth-Key test-key");
});
