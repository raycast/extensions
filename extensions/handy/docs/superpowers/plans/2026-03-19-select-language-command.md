# Select Language Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Select Language` Raycast command that lets users change the transcription language, filtered to languages supported by the active model, with an error if the model doesn't support language selection.

**Architecture:** Pure settings-file reads/writes (no IPC to Handy). Three lib changes (models, settings, new languages), one new view command, one package.json entry. Follows the exact same pattern as `select-model.tsx`.

**Tech Stack:** TypeScript, React, `@raycast/api`, vitest for unit tests.

---

### Task 1: Update `models.ts` — add language fields + Canary models

**Files:**
- Modify: `src/lib/models.ts`
- Modify: `tests/lib/models.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/lib/models.test.ts`:

```ts
// In the MODEL_REGISTRY describe block, replace "has 13 known models":
it("has 15 known models", () => expect(MODEL_REGISTRY).toHaveLength(15));

// New describe block at the end of the file:
describe("MODEL_REGISTRY language selection fields", () => {
  it("Whisper models support language selection with no language filter", () => {
    for (const id of ["small", "medium", "turbo", "large"]) {
      const m = MODEL_REGISTRY.find(m => m.id === id)!;
      expect(m.supportsLanguageSelection).toBe(true);
      expect(m.supportedLanguages).toBeUndefined();
    }
  });

  it("Breeze ASR supports language selection with no language filter", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "breeze-asr")!;
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toBeUndefined();
  });

  it("SenseVoice supports language selection with 7 languages including zh", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "sense-voice-int8")!;
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toEqual(
      expect.arrayContaining(["zh", "zh-Hans", "zh-Hant", "en", "yue", "ja", "ko"])
    );
    expect(m.supportedLanguages).toHaveLength(7);
  });

  it("Canary 180M Flash supports language selection with en/de/es/fr", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "canary-180m-flash")!;
    expect(m).toBeDefined();
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toEqual(
      expect.arrayContaining(["en", "de", "es", "fr"])
    );
    expect(m.supportedLanguages).toHaveLength(4);
  });

  it("Canary 1B v2 supports language selection with 25 languages", () => {
    const m = MODEL_REGISTRY.find(m => m.id === "canary-1b-v2")!;
    expect(m).toBeDefined();
    expect(m.supportsLanguageSelection).toBe(true);
    expect(m.supportedLanguages).toHaveLength(25);
  });

  it("Parakeet models do not support language selection", () => {
    for (const id of ["parakeet-tdt-0.6b-v2", "parakeet-tdt-0.6b-v3"]) {
      expect(MODEL_REGISTRY.find(m => m.id === id)!.supportsLanguageSelection).toBe(false);
    }
  });

  it("Moonshine models do not support language selection", () => {
    for (const id of ["moonshine-base", "moonshine-tiny-streaming-en", "moonshine-small-streaming-en", "moonshine-medium-streaming-en"]) {
      expect(MODEL_REGISTRY.find(m => m.id === id)!.supportsLanguageSelection).toBe(false);
    }
  });

  it("GigaAM does not support language selection", () => {
    expect(MODEL_REGISTRY.find(m => m.id === "gigaam-v3-e2e-ctc")!.supportsLanguageSelection).toBe(false);
  });
});
```

Note: the three inline `{ id: "x", ... }` fixture objects in `isDownloaded` tests will need `supportsLanguageSelection: false` added once the interface is updated in Step 3. Leave them as-is for now — the test runner (vitest) does not type-check, so these tests will still run and fail for the right reasons.

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/models.test.ts
```

Expected: `"has 13 known models"` fails, new language tests fail, fixture type errors.

- [ ] **Step 3: Update `src/lib/models.ts` and fix test fixtures**

Also update the three inline fixture objects in `tests/lib/models.test.ts` to add `supportsLanguageSelection: false` (now that the interface will have the field):

```ts
// e.g.:
{ id: "x", name: "X", description: "", filename: "no.bin", isDirectory: false, supportsLanguageSelection: false }
```

Replace `src/lib/models.ts` with:

```ts
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { MODELS_DIR } from "./constants";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  isDirectory: boolean;
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = all Whisper languages
}

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: "small",
    name: "Whisper Small",
    description: "Fast, fairly accurate",
    filename: "ggml-small.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "medium",
    name: "Whisper Medium",
    description: "Good accuracy, medium speed",
    filename: "whisper-medium-q4_1.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "turbo",
    name: "Whisper Turbo",
    description: "Balanced accuracy and speed",
    filename: "ggml-large-v3-turbo.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "large",
    name: "Whisper Large",
    description: "Good accuracy, but slow",
    filename: "ggml-large-v3-q5_0.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "breeze-asr",
    name: "Breeze ASR",
    description: "Taiwanese Mandarin, code-switching",
    filename: "breeze-asr-q5_k.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet V2",
    description: "English only",
    filename: "parakeet-tdt-0.6b-v2-int8",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet V3",
    description: "25 European languages",
    filename: "parakeet-tdt-0.6b-v3-int8",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-base",
    name: "Moonshine Base",
    description: "Very fast, English only",
    filename: "moonshine-base",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-tiny-streaming-en",
    name: "Moonshine V2 Tiny",
    description: "Ultra-fast, English only",
    filename: "moonshine-tiny-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-small-streaming-en",
    name: "Moonshine V2 Small",
    description: "Fast, English only",
    filename: "moonshine-small-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-medium-streaming-en",
    name: "Moonshine V2 Medium",
    description: "High quality, English only",
    filename: "moonshine-medium-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "sense-voice-int8",
    name: "SenseVoice",
    description: "ZH/EN/JA/KO/Cantonese",
    filename: "sense-voice-int8",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: ["zh", "zh-Hans", "zh-Hant", "en", "yue", "ja", "ko"],
  },
  {
    id: "gigaam-v3-e2e-ctc",
    name: "GigaAM v3",
    description: "Russian, fast and accurate",
    filename: "giga-am-v3.int8.onnx",
    isDirectory: false,
    supportsLanguageSelection: false,
  },
  {
    id: "canary-180m-flash",
    name: "Canary 180M Flash",
    description: "Very fast. English, German, Spanish, French",
    filename: "canary-180m-flash",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: ["en", "de", "es", "fr"],
  },
  {
    id: "canary-1b-v2",
    name: "Canary 1B v2",
    description: "Accurate multilingual. 25 European languages",
    filename: "canary-1b-v2",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: ["bg", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "hu", "it", "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv", "ru", "uk"],
  },
];

export function isDownloaded(
  model: ModelInfo,
  modelsDir = MODELS_DIR,
): boolean {
  return existsSync(join(modelsDir, model.filename));
}

export function getDownloadedModels(modelsDir = MODELS_DIR): ModelInfo[] {
  const known = MODEL_REGISTRY.filter((m) => isDownloaded(m, modelsDir));
  const knownFilenames = new Set(MODEL_REGISTRY.map((m) => m.filename));
  let custom: ModelInfo[] = [];
  try {
    custom = readdirSync(modelsDir)
      .filter((f) => !knownFilenames.has(f))
      .map((f) => {
        const isDir = statSync(join(modelsDir, f)).isDirectory();
        if (!isDir && !f.endsWith(".bin")) return null;
        return {
          id: f,
          name: f,
          description: "Custom model",
          filename: f,
          isDirectory: isDir,
          supportsLanguageSelection: true, // safe fallback: show all languages
        };
      })
      .filter(Boolean) as ModelInfo[];
  } catch {
    /* models dir not created yet */
  }
  return [...known, ...custom];
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/models.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models.ts tests/lib/models.test.ts
git commit -m "feat: add language selection fields to ModelInfo, add Canary models"
```

---

### Task 2: Update `settings.ts` — add `selected_language`

**Files:**
- Modify: `src/lib/settings.ts`
- Modify: `tests/lib/settings.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the `readSettings` describe block in `tests/lib/settings.test.ts`:

```ts
it("reads selected_language", () => {
  writeFileSync(TMP_FILE, JSON.stringify({
    settings: { custom_words: [], selected_model: "small", selected_language: "it" }
  }));
  expect(readSettings(TMP_FILE).selected_language).toBe("it");
});

it("returns 'auto' when selected_language is missing", () => {
  writeFileSync(TMP_FILE, makeStore([], "small")); // makeStore has no selected_language
  expect(readSettings(TMP_FILE).selected_language).toBe("auto");
});
```

Add to the `writeSettings` describe block:

```ts
it("updates selected_language without touching other keys", () => {
  writeFileSync(TMP_FILE, JSON.stringify({
    settings: { custom_words: ["w"], selected_model: "small", selected_language: "en" }
  }));
  writeSettings({ selected_language: "fr" }, TMP_FILE);
  expect(readSettings(TMP_FILE).selected_language).toBe("fr");
  expect(readSettings(TMP_FILE).selected_model).toBe("small");
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/settings.test.ts
```

Expected: the two new `selected_language` tests fail.

- [ ] **Step 3: Update `src/lib/settings.ts`**

```ts
import { readFileSync, renameSync, writeFileSync } from "fs";
import { SETTINGS_PATH } from "./constants";

export interface HandySettings {
  custom_words: string[];
  selected_model: string;
  selected_language: string;
  [key: string]: unknown;
}

interface SettingsStore {
  settings: HandySettings;
}

export function readSettings(filePath: string = SETTINGS_PATH): HandySettings {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  return {
    selected_language: "auto",
    ...store.settings,
  };
}

export function writeSettings(
  update: Partial<HandySettings>,
  filePath: string = SETTINGS_PATH,
): void {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  store.settings = { ...store.settings, ...update };
  const tmp = filePath + ".raycast-tmp";
  writeFileSync(tmp, JSON.stringify(store), "utf-8");
  renameSync(tmp, filePath);
}
```

Note: spreading `{ selected_language: "auto", ...store.settings }` gives the default only when the key is absent, since actual values from `store.settings` override it.

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/settings.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts tests/lib/settings.test.ts
git commit -m "feat: add selected_language to HandySettings with auto default"
```

---

### Task 3: Create `src/lib/languages.ts`

**Files:**
- Create: `src/lib/languages.ts`
- Create: `tests/lib/languages.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/lib/languages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getLanguagesForModel, LANGUAGE_MAP } from "../../src/lib/languages";

describe("LANGUAGE_MAP", () => {
  it("contains auto entry", () => {
    expect(LANGUAGE_MAP["auto"]).toEqual({ label: "Auto (detect)", native: "Auto (detect)" });
  });
  it("contains standard language entries", () => {
    expect(LANGUAGE_MAP["en"]).toBeDefined();
    expect(LANGUAGE_MAP["it"]).toBeDefined();
    expect(LANGUAGE_MAP["zh"]).toBeDefined();
    expect(LANGUAGE_MAP["zh-Hans"]).toBeDefined();
    expect(LANGUAGE_MAP["zh-Hant"]).toBeDefined();
    expect(LANGUAGE_MAP["yue"]).toBeDefined();
  });
});

describe("getLanguagesForModel", () => {
  it("first entry is always auto", () => {
    expect(getLanguagesForModel(undefined)[0].code).toBe("auto");
  });

  it("returns all languages when supportedLanguages is undefined", () => {
    const langs = getLanguagesForModel(undefined);
    expect(langs.length).toBeGreaterThan(50);
  });

  it("filters to supportedLanguages when provided", () => {
    const langs = getLanguagesForModel(["en", "de", "es", "fr"]);
    const codes = langs.map(l => l.code);
    expect(codes).toContain("auto");
    expect(codes).toContain("en");
    expect(codes).toContain("de");
    expect(codes).not.toContain("it");
    expect(langs).toHaveLength(5); // auto + 4
  });

  it("returns only auto for empty supportedLanguages array", () => {
    const langs = getLanguagesForModel([]);
    expect(langs).toHaveLength(1);
    expect(langs[0].code).toBe("auto");
  });

  it("each entry has code, label, native", () => {
    const langs = getLanguagesForModel(["en"]);
    expect(langs[1]).toMatchObject({ code: "en", label: expect.any(String), native: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/languages.test.ts
```

Expected: module not found.

- [ ] **Step 3: Create `src/lib/languages.ts`**

```ts
export interface LanguageOption {
  code: string;
  label: string;   // English name
  native: string;  // Name in native language
}

export const LANGUAGE_MAP: Record<string, { label: string; native: string }> = {
  auto:     { label: "Auto (detect)",    native: "Auto (detect)" },
  en:       { label: "English",          native: "English" },
  zh:       { label: "Chinese",          native: "中文" },
  "zh-Hans":{ label: "Simplified Chinese",   native: "简体中文" },
  "zh-Hant":{ label: "Traditional Chinese",  native: "繁體中文" },
  yue:      { label: "Cantonese",        native: "粵語" },
  de:       { label: "German",           native: "Deutsch" },
  es:       { label: "Spanish",          native: "Español" },
  ru:       { label: "Russian",          native: "Русский" },
  ko:       { label: "Korean",           native: "한국어" },
  fr:       { label: "French",           native: "Français" },
  ja:       { label: "Japanese",         native: "日本語" },
  pt:       { label: "Portuguese",       native: "Português" },
  tr:       { label: "Turkish",          native: "Türkçe" },
  pl:       { label: "Polish",           native: "Polski" },
  ca:       { label: "Catalan",          native: "Català" },
  nl:       { label: "Dutch",            native: "Nederlands" },
  ar:       { label: "Arabic",           native: "العربية" },
  sv:       { label: "Swedish",          native: "Svenska" },
  it:       { label: "Italian",          native: "Italiano" },
  id:       { label: "Indonesian",       native: "Bahasa Indonesia" },
  hi:       { label: "Hindi",            native: "हिन्दी" },
  fi:       { label: "Finnish",          native: "Suomi" },
  vi:       { label: "Vietnamese",       native: "Tiếng Việt" },
  he:       { label: "Hebrew",           native: "עברית" },
  uk:       { label: "Ukrainian",        native: "Українська" },
  el:       { label: "Greek",            native: "Ελληνικά" },
  ms:       { label: "Malay",            native: "Bahasa Melayu" },
  cs:       { label: "Czech",            native: "Čeština" },
  ro:       { label: "Romanian",         native: "Română" },
  da:       { label: "Danish",           native: "Dansk" },
  hu:       { label: "Hungarian",        native: "Magyar" },
  ta:       { label: "Tamil",            native: "தமிழ்" },
  no:       { label: "Norwegian",        native: "Norsk" },
  th:       { label: "Thai",             native: "ภาษาไทย" },
  ur:       { label: "Urdu",             native: "اردو" },
  hr:       { label: "Croatian",         native: "Hrvatski" },
  bg:       { label: "Bulgarian",        native: "Български" },
  lt:       { label: "Lithuanian",       native: "Lietuvių" },
  la:       { label: "Latin",            native: "Latina" },
  mi:       { label: "Maori",            native: "Māori" },
  ml:       { label: "Malayalam",        native: "മലയാളം" },
  cy:       { label: "Welsh",            native: "Cymraeg" },
  sk:       { label: "Slovak",           native: "Slovenčina" },
  te:       { label: "Telugu",           native: "తెలుగు" },
  fa:       { label: "Persian",          native: "فارسی" },
  lv:       { label: "Latvian",          native: "Latviešu" },
  bn:       { label: "Bengali",          native: "বাংলা" },
  sr:       { label: "Serbian",          native: "Српски" },
  az:       { label: "Azerbaijani",      native: "Azərbaycan" },
  sl:       { label: "Slovenian",        native: "Slovenščina" },
  kn:       { label: "Kannada",          native: "ಕನ್ನಡ" },
  et:       { label: "Estonian",         native: "Eesti" },
  mk:       { label: "Macedonian",       native: "Македонски" },
  br:       { label: "Breton",           native: "Brezhoneg" },
  eu:       { label: "Basque",           native: "Euskara" },
  is:       { label: "Icelandic",        native: "Íslenska" },
  hy:       { label: "Armenian",         native: "Հայերեն" },
  ne:       { label: "Nepali",           native: "नेपाली" },
  mn:       { label: "Mongolian",        native: "Монгол" },
  bs:       { label: "Bosnian",          native: "Bosanski" },
  kk:       { label: "Kazakh",           native: "Қазақ" },
  sq:       { label: "Albanian",         native: "Shqip" },
  sw:       { label: "Swahili",          native: "Kiswahili" },
  gl:       { label: "Galician",         native: "Galego" },
  mr:       { label: "Marathi",          native: "मराठी" },
  pa:       { label: "Punjabi",          native: "ਪੰਜਾਬੀ" },
  si:       { label: "Sinhala",          native: "සිංහල" },
  km:       { label: "Khmer",            native: "ខ្មែរ" },
  sn:       { label: "Shona",            native: "chiShona" },
  yo:       { label: "Yoruba",           native: "Yorùbá" },
  so:       { label: "Somali",           native: "Soomaali" },
  af:       { label: "Afrikaans",        native: "Afrikaans" },
  oc:       { label: "Occitan",          native: "Occitan" },
  ka:       { label: "Georgian",         native: "ქართული" },
  be:       { label: "Belarusian",       native: "Беларуская" },
  tg:       { label: "Tajik",            native: "Тоҷикӣ" },
  sd:       { label: "Sindhi",           native: "سنڌي" },
  gu:       { label: "Gujarati",         native: "ગુજરાતી" },
  am:       { label: "Amharic",          native: "አማርኛ" },
  yi:       { label: "Yiddish",          native: "ייִדיש" },
  lo:       { label: "Lao",              native: "ລາວ" },
  uz:       { label: "Uzbek",            native: "Oʻzbek" },
  fo:       { label: "Faroese",          native: "Føroyskt" },
  ht:       { label: "Haitian Creole",   native: "Kreyòl ayisyen" },
  ps:       { label: "Pashto",           native: "پښتو" },
  tk:       { label: "Turkmen",          native: "Türkmen" },
  nn:       { label: "Nynorsk",          native: "Nynorsk" },
  mt:       { label: "Maltese",          native: "Malti" },
  sa:       { label: "Sanskrit",         native: "संस्कृतम्" },
  lb:       { label: "Luxembourgish",    native: "Lëtzebuergesch" },
  my:       { label: "Myanmar",          native: "မြန်မာ" },
  bo:       { label: "Tibetan",          native: "བོད་སྐད།" },
  tl:       { label: "Tagalog",          native: "Filipino" },
  mg:       { label: "Malagasy",         native: "Malagasy" },
  as:       { label: "Assamese",         native: "অসমীয়া" },
  tt:       { label: "Tatar",            native: "Татар" },
  haw:      { label: "Hawaiian",         native: "ʻŌlelo Hawaiʻi" },
  ln:       { label: "Lingala",          native: "Lingála" },
  ha:       { label: "Hausa",            native: "Hausa" },
  ba:       { label: "Bashkir",          native: "Башҡорт" },
  jw:       { label: "Javanese",         native: "Basa Jawa" },
  su:       { label: "Sundanese",        native: "Basa Sunda" },
};

// All non-auto entries as an ordered array (preserves map insertion order)
const ALL_LANGUAGES: LanguageOption[] = Object.entries(LANGUAGE_MAP)
  .filter(([code]) => code !== "auto")
  .map(([code, { label, native }]) => ({ code, label, native }));

const AUTO_OPTION: LanguageOption = { code: "auto", label: "Auto (detect)", native: "Auto (detect)" };

/**
 * Returns languages available for a model.
 * - supportedLanguages === undefined → all Whisper languages
 * - supportedLanguages === []        → only auto (edge case)
 * - supportedLanguages === ["en", …] → filtered list
 * Always prepends the "auto" option.
 */
export function getLanguagesForModel(supportedLanguages?: string[]): LanguageOption[] {
  const filtered = supportedLanguages
    ? ALL_LANGUAGES.filter(({ code }) => supportedLanguages.includes(code))
    : ALL_LANGUAGES;
  return [AUTO_OPTION, ...filtered];
}
```

- [ ] **Step 4: Run test — expect all pass**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test -- tests/lib/languages.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/languages.ts tests/lib/languages.test.ts
git commit -m "feat: add languages lib with getLanguagesForModel helper"
```

---

### Task 4: Create `src/select-language.tsx`

**Files:**
- Create: `src/select-language.tsx`

No unit test for this file (React component — requires Raycast runtime; covered by manual testing).

- [ ] **Step 1: Create `src/select-language.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getLanguagesForModel, LanguageOption } from "./lib/languages";
import { MODEL_REGISTRY } from "./lib/models";
import { readSettings, writeSettings } from "./lib/settings";

export default function SelectLanguage() {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [currentCode, setCurrentCode] = useState("auto");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      const settings = readSettings();
      const modelId = settings.selected_model;
      const model = MODEL_REGISTRY.find((m) => m.id === modelId);

      // Model found and explicitly does not support language selection
      if (model && !model.supportsLanguageSelection) {
        void showToast({
          style: Toast.Style.Failure,
          title: `${model.name} does not support language selection`,
        });
        void closeMainWindow(); // closeMainWindow returns Promise<void>; void to avoid floating promise in sync callback
        return;
      }

      setLanguages(getLanguagesForModel(model?.supportedLanguages));
      setCurrentCode(settings.selected_language ?? "auto");
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load language settings",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(lang: LanguageOption) {
    try {
      writeSettings({ selected_language: lang.code });
      setCurrentCode(lang.code);
      const display = lang.code === "auto" ? "Auto (detect)" : `${lang.native} · ${lang.label}`;
      await showHUD(`Language set to ${display}`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to change language",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search languages...">
      {languages.length === 0 && !isLoading ? (
        <List.EmptyView title="No languages available" />
      ) : (
        languages.map((lang) => (
          <List.Item
            key={lang.code}
            title={lang.code === "auto" ? "Auto (detect)" : `${lang.native} · ${lang.label}`}
            accessories={
              lang.code === currentCode
                ? [{ text: "Active", icon: Icon.Checkmark }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select Language"
                  icon={Icon.Globe}
                  onAction={() => handleSelect(lang)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/select-language.tsx
git commit -m "feat: add Select Language command"
```

---

### Task 5: Register command in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add command entry**

Insert after the `"select-model"` entry in the `"commands"` array in `package.json`:

```json
{
  "name": "select-language",
  "title": "Select Language",
  "subtitle": "Handy",
  "description": "Set the transcription language for the active model",
  "mode": "view"
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Run lint**

```bash
cd /Users/mattiacolombo/Handy/raycast-handy && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: register select-language command in package.json"
```

---

### Task 6: Manual smoke test

- [ ] Run `npm run dev` in the extension directory and open Raycast
- [ ] Search "Select Language" — verify it appears
- [ ] With a Whisper model active: verify full language list appears, active language is checked
- [ ] Select a language — verify HUD appears and language updates
- [ ] With Parakeet active: verify error toast + window closes
- [ ] With no model set (`selected_model: ""`): verify full Whisper list appears
- [ ] Search for "Italiano" — verify it appears and is findable by native name
