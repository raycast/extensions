import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
} from "@raycast/api";
import type { ComponentType } from "react";

// The API key is optional globally so local CLI chat can launch without it.
// Existing API commands keep their setup requirement before mounting any hooks.
export function withAPIKey<P extends object>(Component: ComponentType<P>) {
  return function APIKeyGate(props: P) {
    const { apiKey } = getPreferenceValues<Preferences>();
    if (apiKey?.trim()) return <Component {...props} />;
    return (
      <Detail
        navigationTitle="Set Up ChatGPT"
        markdown={
          "# Add an API Key\n\nThis command uses the OpenAI API. Add your API key in the extension preferences to continue.\n\nTo chat through an already installed and signed-in Codex CLI instead, open **Ask ChatGPT · Local Codex CLI**."
        }
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action
              title="Chat with Local Codex CLI"
              icon={Icon.Message}
              onAction={() => launchCommand({ name: "ask-codex", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  };
}
