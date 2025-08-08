import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

export default function Onboarding() {
  const markdown = `
  # Configuration ⚙️

  To use this extension, you need to configure your OpenAI API key.

  1. Go to [OpenAI's website](https://platform.openai.com/api-keys) to get your API key.
  2. Press \`⏎\` to open the extension preferences.
  3. Paste your API key into the "OpenAI API Key" field.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
