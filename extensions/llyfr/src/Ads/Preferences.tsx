import { Action, ActionPanel, Toast, showToast, Detail, openExtensionPreferences } from "@raycast/api";

export function ValidatePreferences(preferences: Preferences.LlyfrAds) {
  if (!preferences.api_token) {
    showToast({ style: Toast.Style.Failure, title: "ADS API token missing" });
    return {
      status: false,
      component: (
        <Detail
          markdown={"Please set the **ADS API token** in the extension settings."}
          actions={
            <ActionPanel>
              <Action title="Settings" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ),
      api_token: "",
    };
  }
  return { status: true, component: null, api_token: preferences.api_token };
}
