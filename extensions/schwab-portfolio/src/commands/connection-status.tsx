import { Action, ActionPanel, Detail, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCredentialStatus, schwabOAuth, signInToSchwab } from "../lib/oauth";

export default function ConnectionStatus() {
  const { hasAppKey, hasAppSecret } = getCredentialStatus();
  const {
    data: tokenStatus,
    isLoading,
    revalidate,
  } = usePromise(async () => {
    const tokens = await schwabOAuth.client.getTokens();
    return tokens?.accessToken
      ? tokens.isExpired()
        ? "Ready to refresh or sign in again"
        : "Signed in"
      : "Sign-in needed";
  });
  const configured = hasAppKey && hasAppSecret;
  return (
    <Detail
      isLoading={isLoading}
      markdown={`# Schwab Connection\n\nApp Key: **${hasAppKey ? "Saved" : "Missing"}**\n\nApp Secret: **${hasAppSecret ? "Saved" : "Missing"}**\n\nSign-in: **${tokenStatus ?? "Checking…"}**\n\nYour App Key and Secret are one-time settings saved in this extension's Raycast preferences. Weekly Schwab sign-in reuses them. You do not need to create another developer app or paste the keys again.\n\nIf a key is missing, check that you opened the same installation of Schwab Portfolio (store and development copies can have separate preferences).`}
      actions={
        <ActionPanel>
          {configured && (
            <Action
              title="Sign in to Charles Schwab"
              icon={Icon.Person}
              onAction={async () => {
                try {
                  await signInToSchwab();
                  await revalidate();
                  await showToast({ style: Toast.Style.Success, title: "Signed in to Schwab" });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could not sign in",
                    message: error instanceof Error ? error.message : "Try again",
                  });
                }
              }}
            />
          )}
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
