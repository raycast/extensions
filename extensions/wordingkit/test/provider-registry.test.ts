import assert from "node:assert/strict";
import test from "node:test";
import {
  getProviderDefinition,
  isProvider,
  PROVIDER_REGISTRY,
} from "../src/provider-registry.ts";

test("provider registry describes every supported provider", () => {
  assert.deepEqual(PROVIDER_REGISTRY, [
    {
      id: "openai",
      title: "OpenAI",
      location: "cloud",
      adapter: "openai-compatible",
      credentialKey: "openaiApiKey",
      defaultBaseUrl: "https://api.openai.com/v1",
    },
    {
      id: "anthropic",
      title: "Anthropic",
      location: "cloud",
      adapter: "anthropic",
      credentialKey: "anthropicApiKey",
      defaultBaseUrl: "https://api.anthropic.com/v1",
    },
    {
      id: "groq",
      title: "Groq",
      location: "cloud",
      adapter: "openai-compatible",
      credentialKey: "groqApiKey",
      defaultBaseUrl: "https://api.groq.com/openai/v1",
    },
    {
      id: "ollama",
      title: "Ollama",
      location: "local",
      adapter: "ollama",
      credentialKey: null,
      defaultBaseUrl: "http://127.0.0.1:11434",
    },
  ]);
});

test("provider registry IDs are unique", () => {
  const ids = PROVIDER_REGISTRY.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length);
});

test("provider lookup and predicate reject unknown values", () => {
  assert.equal(getProviderDefinition("groq")?.title, "Groq");
  assert.equal(getProviderDefinition("custom"), undefined);
  assert.equal(isProvider("ollama"), true);
  assert.equal(isProvider("custom"), false);
  assert.equal(isProvider(null), false);
});
