import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("rewrite command loads, sorts, and sends the selected full mode", async () => {
  const index = await source("../src/index.tsx");

  assert.match(
    index,
    /import\s+\{[\s\S]*loadModeSettings,[\s\S]*markModeUsed,[\s\S]*sortModes,[\s\S]*type EditingMode,[\s\S]*\}\s+from\s+["']\.\/modes/,
  );
  assert.match(index, /const\s+\{\s*modes,\s*sortMode,\s*language\s*\}\s*=\s*await\s+loadModeSettings\(\)/);
  assert.match(index, /setModes\(modes\)/);
  assert.match(index, /setSortMode\(sortMode\)/);
  assert.match(index, /setLanguage\(language\)/);
  assert.match(index, /getUiStrings\(language\)/);
  assert.match(index, /const\s+sortedModes\s*=\s*sortModes\(modes,\s*sortMode\)/);
  assert.match(index, /sortedModes\.map\(\(mode\)/);
  assert.match(index, /onAction=\{\(\)\s*=>\s*rewrite\(mode\)\}/);
  assert.match(
    index,
    /const\s+usedMode\s*=\s*await\s+markModeUsed\(mode\.id,\s*new Date\(\)\.toISOString\(\)\)/,
  );
  assert.match(index, /setModes\(\(currentModes\)\s*=>/);
  assert.match(index, /currentMode\.id === usedMode\.id \? usedMode : currentMode/);
  assert.match(index, /markModeUsed[\s\S]*setModes[\s\S]*await\s+rewriteText\(options,\s*controller\.signal\)/);
  assert.match(index, /mode,\s*apiKey,/);
  assert.doesNotMatch(index, /RUSSIAN_STYLES|tone:/);
});

test("rewrite command resolves provider credentials through the registry", async () => {
  const index = await source("../src/index.tsx");

  assert.match(index, /getProviderDefinition/);
  assert.match(index, /provider\.credentialKey/);
  assert.match(index, /preferences\[provider\.credentialKey\]/);
  assert.match(index, /provider\.location === "cloud"/);
  assert.doesNotMatch(index, /const\s+apiKeys\s*=/);
});

test("settings exposes manual ordering controls alongside mode management", async () => {
  const settings = await source("../src/settings.tsx");

  assert.match(settings, /loadModeSettings/);
  assert.match(settings, /setSortMode/);
  assert.match(settings, /moveMode/);
  assert.match(settings, /<List/);
  assert.match(settings, /ModeForm/);
  assert.match(settings, /Action\.Push/);
  assert.match(settings, /ActionPanel\.Submenu/);
  assert.match(settings, /Icon\.ArrowUp/);
  assert.match(settings, /Icon\.ArrowDown/);
  assert.match(settings, /sortMode/);
  assert.match(settings, /index > 0/);
  assert.match(settings, /index < modes\.length - 1/);
  assert.match(settings, /icon=\{Icon\.Trash\}/);
  assert.match(settings, /confirmAlert/);
  assert.match(settings, /resetModes/);
  assert.match(settings, /setLanguage/);
  assert.match(settings, /Icon\.Globe/);
  assert.match(settings, /getUiStrings/);
  assert.match(settings, /openExtensionPreferences/);
  assert.match(settings, /List\.EmptyView/);
});

test("rewrite command presents an empty-mode route to Settings", async () => {
  const index = await source("../src/index.tsx");

  assert.match(index, /ui\.noModes/);
  assert.match(index, /ui\.openSettings/);
  assert.match(index, /getRewriteViewState/);
});

test("rewrite items render in sorted order only after selected text and modes are ready", async () => {
  const index = await source("../src/index.tsx");

  assert.match(index, /viewState === "ready"\s*\?\s*sortedModes\.map/);
});

test("mode form validates user input and delegates mode persistence", async () => {
  const form = await source("../src/mode-form.tsx");

  for (const field of [
    "title",
    "description",
    "provider",
    "model",
    "systemPrompt",
    "temperature",
    "maxTokens",
  ]) {
    assert.match(form, new RegExp(`id=["']${field}["']`));
  }
  assert.match(form, /validateEditingMode/);
  assert.match(form, /createMode/);
  assert.match(form, /updateMode/);
  assert.match(form, /PROVIDER_REGISTRY\.map/);
  assert.doesNotMatch(form, /const\s+providerOptions/);
});
