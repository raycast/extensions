import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

type ManifestPreference = {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  data?: Array<{ title: string; value: string }>;
};

type Manifest = {
  commands: Array<{ name: string }>;
  preferences: ManifestPreference[];
};

async function loadManifest(): Promise<Manifest> {
  const source = await readFile(
    new URL("../package.json", import.meta.url),
    "utf8",
  );
  return JSON.parse(source) as Manifest;
}

test("manifest exposes only rewrite and settings commands", async () => {
  const manifest = await loadManifest();

  assert.deepEqual(
    manifest.commands.map(({ name }) => name),
    ["index", "settings"],
  );
});

test("manifest uses separate optional API key preferences per cloud provider", async () => {
  const manifest = await loadManifest();
  const preferences = new Map(
    manifest.preferences.map((preference) => [preference.name, preference]),
  );

  assert.deepEqual(
    ["openaiApiKey", "anthropicApiKey", "groqApiKey"].map((name) => {
      const preference = preferences.get(name);
      return (
        preference && {
          name: preference.name,
          type: preference.type,
          required: preference.required,
        }
      );
    }),
    [
      { name: "openaiApiKey", type: "password", required: false },
      { name: "anthropicApiKey", type: "password", required: false },
      { name: "groqApiKey", type: "password", required: false },
    ],
  );
  assert.equal(preferences.has("provider"), false);
  assert.equal(preferences.has("model"), false);
  assert.equal(preferences.has("apiKey"), false);
});

test("manifest retains the optional Ollama URL preference", async () => {
  const manifest = await loadManifest();
  const ollamaUrl = manifest.preferences.find(
    ({ name }) => name === "ollamaUrl",
  );

  assert.deepEqual(
    ollamaUrl && {
      name: ollamaUrl.name,
      type: ollamaUrl.type,
      required: ollamaUrl.required,
    },
    {
      name: "ollamaUrl",
      type: "textfield",
      required: false,
    },
  );
});

test("manifest exposes preset language as a functional preference", async () => {
  const manifest = await loadManifest();
  const preference = manifest.preferences.find(
    ({ name }) => name === "presetLanguage",
  );

  assert.deepEqual(preference, {
    name: "presetLanguage",
    title: "Preset Language",
    description: "Language used when resetting editing modes",
    type: "dropdown",
    required: false,
    default: "en",
    data: [
      { title: "English", value: "en" },
      { title: "Russian", value: "ru" },
    ],
  });
});
