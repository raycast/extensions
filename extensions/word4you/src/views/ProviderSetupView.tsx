import { List, ActionPanel, Action, Icon, openExtensionPreferences, popToRoot } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  aiProvider: string;
  geminiApiKey: string;
  qwenApiKey: string;
}

export function ProviderSetupView() {
  const preferences = getPreferenceValues<Preferences>();

  const provider = preferences.aiProvider || "gemini";
  const hasGeminiKey = Boolean(preferences.geminiApiKey);
  const hasQwenKey = Boolean(preferences.qwenApiKey);

  let message = "";
  if (provider === "gemini" && !hasGeminiKey) {
    message = "Please enter your Gemini API key in the extension preferences.";
  } else if (provider === "qwen" && !hasQwenKey) {
    message = "Please enter your Qwen API key in the extension preferences.";
  }

  return (
    <List isShowingDetail>
      <List.EmptyView
        title="Configuration Required"
        icon={Icon.Warning}
        description={message || "Please configure your AI provider and API key in extension preferences"}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                await openExtensionPreferences();
                await popToRoot();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
