import { useCachedState } from "@raycast/utils";
import { nanoid } from "nanoid";

/**
 * Represents an AI commit message prompt preset.
 */
export interface AiPromptPreset {
  /** Unique identifier of the preset */
  id: string;
  /** Human-friendly preset name */
  name: string;
  /** Prompt template text to guide AI */
  prompt: string;
  /** AI model to use for the prompt */
  model?: string;
  /** Icon to use for the preset */
  icon?: string;
}

/**
 * Represents the data structure for storing AI prompt presets.
 */
export interface AiPromptPresetsData {
  /** List of all presets */
  presets: AiPromptPreset[];
  /** ID of the default preset */
  defaultPresetId: string;
}

/**
 * Default prompt used when there are no saved presets.
 */
const CONVENTIONAL_MESSAGE_PROMPT: AiPromptPreset = {
  id: "conventional-commits-style",
  name: "Conventional Style",
  prompt: `
You are a Git commit message generator. Analyze the git diff and create a conventional commit message.

Format:
<type>(<scope>): <description>

- <change 1>
- <change 2>

Types: feat, fix, refactor, docs, style, test, chore, perf, ci, build
- Keep title under 50 characters
- Use imperative mood ("add" not "added")
- Focus on WHAT changed, not why
- Omit body if changes are trivial

Output only the commit message, no markdown or extra text.
`.trim(),
  model: "Google_Gemini_2.5_Flash",
};

/**
 * Gitmoji style commit message prompt.
 */
const GITMOJI_MESSAGE_PROMPT: AiPromptPreset = {
  id: "gitmoji-style",
  name: "Gitmoji Style",
  icon: "🎨",
  prompt: `
You are a Git commit message generator. Analyze the git diff and create a gitmoji-style commit message.

Format:
:emoji: (<scope>): <description>

- <change 1>
- <change 2>

Common emojis:
- ✨ - New feature
- 🐛 - Bug fix
- 📝 - Documentation changes
- 💄 - UI/style improvements
- ♻️ - Code refactoring
- 🔥 - Removing code/files
- ✅ - Adding tests
- 🚀 - Performance improvements
- 🔧 - Configuration changes
- 📦 - Dependency updates

- Keep title under 50 characters
- Use imperative mood ("add" not "added")
- Focus on WHAT changed, not why
- Choose the most appropriate emoji for the change
- Omit body if changes are trivial

Output only the commit message, no markdown or extra text.
`.trim(),
  model: "Google_Gemini_2.5_Flash",
};

/**
 * Minimalist style commit message prompt.
 */
const MINIMALIST_MESSAGE_PROMPT: AiPromptPreset = {
  id: "minimalist-style",
  name: "Minimalist Style",
  icon: "🔘",
  prompt: `
You are a Git commit message generator. Analyze the git diff and create a short, one-line commit message.

- Keep it under 50 characters.
- Describe WHAT changed.
- No prefixes, scopes, or emojis.

Output only the commit message, no markdown or extra text.
`.trim(),
  model: "Google_Gemini_2.5_Flash",
};

/**
 * Hook for managing AI commit message prompt presets in cached state.
 * Presets are global for the extension (not per repository).
 */
export function useAiPromptPresets() {
  const [data, setData] = useCachedState<AiPromptPresetsData>("ai-prompt-presets", {
    presets: [CONVENTIONAL_MESSAGE_PROMPT, GITMOJI_MESSAGE_PROMPT, MINIMALIST_MESSAGE_PROMPT],
    defaultPresetId: CONVENTIONAL_MESSAGE_PROMPT.id,
  });

  const defaultPreset = data.presets.find((p) => p.id === data.defaultPresetId) ?? CONVENTIONAL_MESSAGE_PROMPT;
  const otherPresets = data.presets.filter((p) => p.id !== data.defaultPresetId);

  const addPreset = (name: string, prompt: string, model?: string) => {
    const newPreset: AiPromptPreset = { id: nanoid(), ...parsePresetName(name), prompt: prompt, model };
    setData((current) => {
      return {
        ...current,
        presets: [...current.presets, newPreset],
      };
    });
  };

  const updatePreset = (id: string, name: string, prompt: string, model?: string) => {
    setData((current) => {
      return {
        ...current,
        presets: current.presets.map((p) =>
          p.id === id ? { ...p, ...parsePresetName(name), prompt: prompt, model } : p,
        ),
      };
    });
  };

  const deletePreset = (id: string) => {
    setData((current) => {
      return {
        ...current,
        presets: current.presets.filter((p) => p.id !== id),
      };
    });
  };

  const setDefault = (id: string) => {
    setData((current) => {
      if (current.presets.some((p) => p.id === id)) {
        return { ...current, defaultPresetId: id };
      }
      return current;
    });
  };

  return {
    defaultPreset,
    otherPresets,
    addPreset,
    updatePreset,
    deletePreset,
    setDefault,
  };
}

/**
 * Parse the name of a preset into an icon and name.
 * If the name starts with an emoji, the emoji is returned as the icon.
 * @param name - The name of the preset.
 * @returns The icon and name.
 */
function parsePresetName(name: string): { icon?: string; name: string } {
  // This regex captures both standard emojis and country flag emojis (which are composed of two Unicode characters)
  const emojiMatch = name.match(/^(\p{Emoji}(\p{Emoji_Modifier}|\p{Emoji_Component})*)\s+(.+)$/u);

  if (emojiMatch) {
    const [, emoji, , actualName] = emojiMatch;
    return { icon: emoji, name: actualName };
  }

  return { name: name };
}
