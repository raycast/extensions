import assert from "node:assert/strict";
import test from "node:test";
import { chatCompletionsUrl, modelsUrl, normalizeBaseUrl } from "../src/url";

test("normalizes common provider base URLs", () => {
  assert.equal(normalizeBaseUrl("https://api.openai.com/v1/"), "https://api.openai.com/v1");
  assert.equal(
    normalizeBaseUrl("https://open.bigmodel.cn/api/paas/v4/chat/completions"),
    "https://open.bigmodel.cn/api/paas/v4",
  );
});

test("builds chat and model endpoints", () => {
  assert.equal(chatCompletionsUrl("http://127.0.0.1:11434/v1"), "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(modelsUrl("https://api.together.ai/v1"), "https://api.together.ai/v1/models");
});

test("rejects unsafe or ambiguous base URLs", () => {
  assert.throws(() => normalizeBaseUrl("file:///tmp/api"), /HTTP or HTTPS/);
  assert.throws(() => normalizeBaseUrl("https://example.com/v1?api-version=1"), /query string/);
});
