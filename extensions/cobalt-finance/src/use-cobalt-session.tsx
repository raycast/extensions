import { Action, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

import { authorize, logout } from "./oauth";

/**
 * Shared across every command: resolves the API base URL, drives the
 * sign-in effect, and exposes a ready-made "Sign out" action so each
 * command doesn't have to re-implement auth wiring.
 */
export function useCobaltSession() {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
  const usingApiKey = !!apiKey?.trim();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const token = await authorize(base);
        setAccessToken(token);
      } catch (error) {
        showFailureToast(error, { title: "Sign-in failed" });
      }
    };
    void run();
  }, [base]);

  // An API key preference always wins over OAuth (see authorize() in oauth.ts), so
  // clearing OAuth tokens here would silently no-op: the very next command launch
  // reads the API key again and restores the session. Send API-key users to
  // preferences instead, since that's the only way to actually sign out.
  const signOutAction = usingApiKey ? (
    <Action
      title="Remove API Key to Sign out"
      icon={Icon.Key}
      shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
      onAction={openExtensionPreferences}
    />
  ) : (
    <Action
      title="Sign out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      shortcut={{ key: "l", modifiers: ["cmd", "shift"] }}
      onAction={async () => {
        await logout();
        setAccessToken(null);
      }}
    />
  );

  return { accessToken, base, signOutAction };
}
