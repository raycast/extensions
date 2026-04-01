import { Action, ActionPanel, Detail, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

// * Auth Gate - wraps content and checks if API key is configured
export function AuthGate({ children }: { children: (signOut: () => Promise<void>) => React.ReactNode }) {
  const { apiKey } = getPreferenceValues();

  async function signOut() {
    await openExtensionPreferences();
  }

  // API key validation happens server-side on each request
  // Just check if it's configured
  if (!apiKey?.trim()) {
    return (
      <Detail
        markdown={[
          "## Email Finder",
          "",
          "To use this extension, add your **API Key** in Raycast preferences for this extension.",
          "",
          "Get your API key from your dashboard.",
        ].join("\n")}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return <>{children(signOut)}</>;
}
