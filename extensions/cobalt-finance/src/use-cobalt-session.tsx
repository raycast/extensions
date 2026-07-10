import { Action, getPreferenceValues, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";

import { authorize, logout } from "./oauth";

/**
 * Shared across every command: resolves the API base URL, drives the
 * sign-in effect, and exposes a ready-made "Sign out" action so each
 * command doesn't have to re-implement auth wiring.
 */
export function useCobaltSession() {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const base = (apiUrl || "https://api.cobaltpf.com").replace(/\/+$/, "");
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

  const signOutAction = (
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
