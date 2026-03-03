import { Action, ActionPanel, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearCodexAuthSession, resolveAuthStatus, signInWithCodexAuth } from "../utils/auth";
import { getErrorMessage } from "../utils/error";

export const PreferencesActionSection = () => {
  const [isBusy, setBusy] = useState(false);
  const [isChatGPTAuthorized, setChatGPTAuthorized] = useState(false);

  const refreshAuthState = useCallback(async () => {
    const auth = await resolveAuthStatus();
    setChatGPTAuthorized(auth.hasChatGPTSession);
  }, []);

  useEffect(() => {
    refreshAuthState();
  }, [refreshAuthState]);

  async function handleSignInWithChatGPT() {
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening ChatGPT sign-in...",
    });

    try {
      await signInWithCodexAuth();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in with ChatGPT";
      toast.message = "Codexauth session is now active.";
      await refreshAuthState();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Sign-in failed";
      toast.message = getErrorMessage(error, "Could not complete ChatGPT sign-in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOutFromChatGPT() {
    setBusy(true);
    await clearCodexAuthSession();
    await refreshAuthState();
    setBusy(false);

    await showToast({
      style: Toast.Style.Success,
      title: "Signed out of ChatGPT",
      message: "Your codexauth session was removed from local storage.",
    });
  }

  return (
    <ActionPanel.Section title="Preferences">
      {isChatGPTAuthorized ? (
        <Action
          icon={Icon.XMarkCircle}
          title="Sign out"
          onAction={handleSignOutFromChatGPT}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      ) : (
        <Action
          icon={Icon.TwoPeople}
          title="Sign in"
          onAction={handleSignInWithChatGPT}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      )}

      <Action
        icon={Icon.Gear}
        title={isBusy ? "Working…" : "Open Extension Preferences"}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
};
