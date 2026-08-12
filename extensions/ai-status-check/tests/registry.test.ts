import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { PROVIDER_CATEGORY_TITLES } from "../src/providers/categories";
import {
  DEFAULT_ENABLED_PROVIDER_IDS,
  getEnabledProviders,
  isProviderEnabledByDefault,
  PROVIDERS,
} from "../src/providers/registry";

const expectedProviderIds = [
  "openai",
  "claude",
  "gemini-api",
  "xai",
  "deepseek",
  "mistral-ai",
  "cohere",
  "perplexity",
  "openrouter",
  "groq",
  "together-ai",
  "fireworks-ai",
  "cerebras",
  "replicate",
  "hugging-face",
  "baseten",
  "elevenlabs",
  "stability-ai",
];

test("common providers are enabled by default and every provider remains configurable", () => {
  assert.deepEqual(
    getEnabledProviders({}).map((provider) => provider.id),
    DEFAULT_ENABLED_PROVIDER_IDS,
  );
  assert.deepEqual(
    getEnabledProviders({ showClaude: false, showElevenLabs: true }).map((provider) => provider.id),
    [...DEFAULT_ENABLED_PROVIDER_IDS.filter((id) => id !== "claude"), "elevenlabs"],
  );
});

test("the first-release provider inventory remains complete and unique", () => {
  assert.deepEqual(
    PROVIDERS.map((provider) => provider.id),
    expectedProviderIds,
  );
  assert.equal(new Set(PROVIDERS.map((provider) => provider.id)).size, PROVIDERS.length);
  assert.equal(new Set(PROVIDERS.map((provider) => provider.preferenceKey)).size, PROVIDERS.length);
});

test("the provider registry and manifest checkbox preferences stay in sync", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    preferences?: Array<{ name?: string; type?: string; title?: string; label?: string; default?: boolean }>;
  };
  const manifestPreferences = (packageJson.preferences ?? [])
    .filter((preference) => preference.type === "checkbox")
    .map(({ name, title, label, default: defaultValue }) => ({ name, title, label, default: defaultValue }));
  const registryPreferences = PROVIDERS.map((provider, index) => ({
    name: provider.preferenceKey,
    title:
      index === 0 || PROVIDERS[index - 1]?.category !== provider.category
        ? PROVIDER_CATEGORY_TITLES[provider.category]
        : "",
    label: provider.name,
    default: isProviderEnabledByDefault(provider.id),
  }));

  assert.deepEqual(manifestPreferences, registryPreferences);
});

test("every provider has a bundled icon", async () => {
  assert.equal(new Set(PROVIDERS.map((provider) => provider.icon)).size, PROVIDERS.length);

  await Promise.all(
    PROVIDERS.map(async (provider) => {
      await assert.doesNotReject(access(join("assets", provider.icon)), `${provider.name} icon is missing`);
    }),
  );
});
