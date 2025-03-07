import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AIModelEnum } from "./constants/aiModels";
import { LocalStorage } from "@raycast/api";

// Interface for extension preferences
export interface Preferences {
  defaultLanguage: string;
  defaultModel: string;
  defaultDifficultyLevel: string;
  enhancementPrompt: string;
  enhancementModel: string;
  maxTags: number;
}

// Default values for preferences
const DEFAULT_PREFERENCES: Preferences = {
  defaultLanguage: "english",
  defaultModel: AIModelEnum.GPT4o,
  defaultDifficultyLevel: "intermediate",
  enhancementPrompt:
    "Improve this flashcard while maintaining the main idea, but making the question clearer and the answer more complete and educational. Keep the extra information relevant.",
  enhancementModel: AIModelEnum.GPT4o,
  maxTags: 2,
};

// Key for storing custom preferences
const CUSTOM_PREFERENCES_KEY = "anki_ai_custom_preferences";

// Function to get preferences (combining Raycast-defined with custom ones)
export async function getCustomPreferences(): Promise<Preferences> {
  try {
    // Get preferences defined by Raycast
    const raycastPrefs = getPreferenceValues<Preferences>();

    // Get stored custom preferences
    const storedPrefsString = await LocalStorage.getItem(CUSTOM_PREFERENCES_KEY);
    const storedPrefs = storedPrefsString ? JSON.parse(storedPrefsString) : {};

    // Combine preferences, with priority for custom ones
    return { ...DEFAULT_PREFERENCES, ...raycastPrefs, ...storedPrefs };
  } catch (error) {
    console.error("Error loading preferences:", error);
    return { ...DEFAULT_PREFERENCES, ...getPreferenceValues<Preferences>() };
  }
}

// Function to save custom preferences
export async function saveCustomPreferences(preferences: Partial<Preferences>): Promise<void> {
  try {
    // Get current custom preferences
    const storedPrefsString = await LocalStorage.getItem(CUSTOM_PREFERENCES_KEY);
    const currentPrefs = storedPrefsString ? JSON.parse(storedPrefsString) : {};

    // Update with new preferences
    const updatedPrefs = { ...currentPrefs, ...preferences };

    // Save updated preferences
    await LocalStorage.setItem(CUSTOM_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error;
  }
}

// Component for editing preferences
export default function PreferencesCommand() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on start
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getCustomPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Function to save changes
  const handleSubmit = async (values: Preferences) => {
    try {
      await saveCustomPreferences(values);
      showToast({ style: Toast.Style.Success, title: "Preferences saved successfully" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error saving preferences",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // List of available AI models
  const aiModels = [
    // Raycast
    { value: AIModelEnum.RAY1, label: "Ray1" },
    { value: AIModelEnum.RAY1_MINI, label: "Ray1 Mini" },

    // OpenAI
    { value: AIModelEnum.GPT3_5, label: "GPT-3.5 Turbo" },
    { value: AIModelEnum.GPT4, label: "GPT-4" },
    { value: AIModelEnum.GPT4_TURBO, label: "GPT-4 Turbo" },
    { value: AIModelEnum.GPT4o, label: "GPT-4o (Recommended)" },
    { value: AIModelEnum.GPT4o_MINI, label: "GPT-4o Mini (Faster)" },
    { value: AIModelEnum.O1, label: "OpenAI O1" },
    { value: AIModelEnum.O1_MINI, label: "OpenAI O1 Mini" },
    { value: AIModelEnum.O3_MINI, label: "OpenAI O3 Mini" },

    // Claude
    { value: AIModelEnum.CLAUDE3_5_HAIKU, label: "Claude 3.5 Haiku" },
    { value: AIModelEnum.CLAUDE3_5_SONNET, label: "Claude 3.5 Sonnet" },
    { value: AIModelEnum.CLAUDE3_7_SONNET, label: "Claude 3.7 Sonnet" },
    { value: AIModelEnum.CLAUDE3_OPUS, label: "Claude 3 Opus (High complexity)" },
    { value: AIModelEnum.CLAUDE3_SONNET, label: "Claude 3 Sonnet (Balanced)" },
    { value: AIModelEnum.CLAUDE3_HAIKU, label: "Claude 3 Haiku (Faster)" },
  ];

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="General Settings" text="Configure default preferences for flashcard generation" />

      <Form.Dropdown
        id="defaultModel"
        title="Default AI Model"
        value={preferences.defaultModel}
        onChange={(value) => setPreferences({ ...preferences, defaultModel: value })}
      >
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultLanguage"
        title="Default Language"
        value={preferences.defaultLanguage}
        onChange={(value) => setPreferences({ ...preferences, defaultLanguage: value })}
      >
        <Form.Dropdown.Item value="english" title="English" />
        <Form.Dropdown.Item value="português" title="Portuguese" />
        <Form.Dropdown.Item value="español" title="Spanish" />
      </Form.Dropdown>

      <Form.Dropdown
        id="defaultDifficultyLevel"
        title="Default Difficulty Level"
        value={preferences.defaultDifficultyLevel}
        onChange={(value) => setPreferences({ ...preferences, defaultDifficultyLevel: value })}
      >
        <Form.Dropdown.Item value="beginner" title="Beginner" />
        <Form.Dropdown.Item value="intermediate" title="Intermediate" />
        <Form.Dropdown.Item value="advanced" title="Advanced" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Enhancement Settings" text="Configure how flashcards are enhanced by AI" />

      <Form.TextArea
        id="enhancementPrompt"
        title="Enhancement Prompt"
        placeholder="Instructions for AI to improve flashcards"
        value={preferences.enhancementPrompt}
        onChange={(value) => setPreferences({ ...preferences, enhancementPrompt: value })}
      />

      <Form.Dropdown
        id="enhancementModel"
        title="Enhancement Model"
        value={preferences.enhancementModel}
        onChange={(value) => setPreferences({ ...preferences, enhancementModel: value })}
      >
        {aiModels.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.label} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description title="Tag Settings" text="Configure how tags are generated and managed" />

      <Form.TextField
        id="maxTags"
        title="Maximum Number of Tags"
        placeholder="Maximum number of tags per flashcard"
        value={String(preferences.maxTags)}
        onChange={(value) => {
          const num = parseInt(value);
          if (!isNaN(num) && num > 0) {
            setPreferences({ ...preferences, maxTags: num });
          }
        }}
      />
    </Form>
  );
}
