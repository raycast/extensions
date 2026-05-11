import { ActionPanel, Action, Detail, openExtensionPreferences } from "@raycast/api";

interface AuthErrorViewProps {
  error: string;
}

export function AuthErrorView({ error }: AuthErrorViewProps) {
  const markdown = `
# Authentication Required

${error}

## How to configure:

1. **Get your API Key:**
   - Log in to your Dodo Payments dashboard
   - Navigate to Settings > API Keys
   - Copy your API key

2. **Configure the extension:**
   - Click "Open Extension Preferences" below
   - Paste your API key in the "API Key" field
   - Select your preferred API mode (Test or Live)
   - Save the settings

3. **Try again:**
   - Return to this command and it should work with your configured credentials

## API Modes:

- **Test Mode**: Use this for development and testing. Transactions won't be processed.
- **Live Mode**: Use this for production. Real transactions will be processed.

⚠️ **Important**: Make sure you're using the correct API mode for your environment.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
