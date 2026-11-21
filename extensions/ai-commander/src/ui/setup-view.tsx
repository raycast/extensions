import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const MARKDOWN = `# Welcome to AI-Commander

Add at least one API key to get started. Each key unlocks a group of models:

- **OpenRouter**: all model families
- **Anthropic**: Claude, directly
- **OpenAI**: GPT, directly
- **Gemini**: Gemini, directly

A direct key takes over its family from OpenRouter automatically.

Keys stay in Raycast's encrypted preferences. Then choose a default model in **Models & Providers**.`;

/** Raycast only prompts for required preferences and all four keys are optional, so this replaces its setup screen. */
export function SetupView() {
  return (
    <Detail
      markdown={MARKDOWN}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Key} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
