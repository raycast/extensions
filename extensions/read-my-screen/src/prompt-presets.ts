import { LocalStorage } from "@raycast/api";

/** Previous key; data is migrated on read. */
const LEGACY_CUSTOM_PRESETS_KEY = "screen-ai:custom-prompt-presets-v1";

export const CUSTOM_PRESETS_KEY = "read-my-screen:custom-prompt-presets-v1";

export type CustomPromptPreset = {
  id: string;
  title: string;
  prompt: string;
};

/** Built-in templates (not persisted). */
export const BUILTIN_PROMPT_PRESETS: { id: string; title: string; prompt: string }[] = [
  {
    id: "builtin-describe",
    title: "Describe the screen",
    prompt: "Describe what you see on the screen. Call out any text, UI elements, errors, or notable details.",
  },
  {
    id: "builtin-errors",
    title: "Explain errors",
    prompt:
      "Focus on any error messages, stack traces, failure states, or warning UI. Explain likely causes and concrete fixes.",
  },
  {
    id: "builtin-summarize",
    title: "Summarize",
    prompt: "Summarize the main content briefly in clear language.",
  },
  {
    id: "builtin-a11y",
    title: "UI & accessibility review",
    prompt:
      "Review the visible UI for clarity, consistency, and accessibility (contrast, labels, focus, semantics). List actionable improvements.",
  },
  {
    id: "builtin-ocr",
    title: "Extract text (OCR)",
    prompt: "Transcribe all visible text as accurately as possible. Preserve structure where helpful.",
  },
];

export const PRESET_PREF_DEFAULT = "pref:default";

export async function loadCustomPresets(): Promise<CustomPromptPreset[]> {
  let raw = await LocalStorage.getItem<string>(CUSTOM_PRESETS_KEY);
  if (!raw?.trim()) {
    raw = await LocalStorage.getItem<string>(LEGACY_CUSTOM_PRESETS_KEY);
    if (raw?.trim()) {
      await LocalStorage.setItem(CUSTOM_PRESETS_KEY, raw);
    }
  }
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (p): p is CustomPromptPreset =>
        p &&
        typeof p === "object" &&
        typeof (p as CustomPromptPreset).id === "string" &&
        typeof (p as CustomPromptPreset).title === "string" &&
        typeof (p as CustomPromptPreset).prompt === "string",
    );
  } catch {
    return [];
  }
}

export async function saveCustomPresets(presets: CustomPromptPreset[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets));
}

export async function addCustomPreset(title: string, prompt: string): Promise<CustomPromptPreset[]> {
  const trimmedTitle = title.trim();
  const trimmedPrompt = prompt.trim();
  if (!trimmedTitle || !trimmedPrompt) {
    return loadCustomPresets();
  }
  const list = await loadCustomPresets();
  const next: CustomPromptPreset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: trimmedTitle,
    prompt: trimmedPrompt,
  };
  list.push(next);
  await saveCustomPresets(list);
  return list;
}

export async function removeCustomPreset(id: string): Promise<CustomPromptPreset[]> {
  const list = (await loadCustomPresets()).filter((p) => p.id !== id);
  await saveCustomPresets(list);
  return list;
}

export function promptForPresetValue(
  presetValue: string,
  defaultFromPreferences: string,
  customPresets: CustomPromptPreset[],
): string | undefined {
  if (presetValue === PRESET_PREF_DEFAULT) {
    return defaultFromPreferences;
  }
  if (presetValue.startsWith("builtin:")) {
    const id = presetValue.slice("builtin:".length);
    return BUILTIN_PROMPT_PRESETS.find((b) => b.id === id)?.prompt;
  }
  if (presetValue.startsWith("custom:")) {
    const id = presetValue.slice("custom:".length);
    return customPresets.find((c) => c.id === id)?.prompt;
  }
  return undefined;
}
