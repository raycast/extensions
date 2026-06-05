import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { RecentAliases } from "./components/RecentAliases";
import { SetupForm } from "./components/SetupForm";
import { generateAddress, getDashboard, loginWithOtp } from "./lib/ddg-api";
import { getToastOptions, isDdgApiError } from "./lib/errors";
import type { Preferences } from "./lib/preferences";
import {
  clearRecentAliases,
  clearStoredSession,
  getRecentAliases,
  getStoredSession,
  saveRecentAlias,
  saveStoredSession,
} from "./lib/storage";
import type { RecentAlias, StoredSession } from "./types/ddg";

type SetupFormValues = {
  username: string;
  otp: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [session, setSession] = useState<StoredSession>();
  const [recentAliases, setRecentAliases] = useState<RecentAlias[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const accessToken = useMemo(
    () => preferences.accessToken || session?.accessToken,
    [preferences.accessToken, session],
  );

  useEffect(() => {
    async function loadState() {
      const [storedSession, aliases] = await Promise.all([
        getStoredSession(),
        getRecentAliases(),
      ]);
      setSession(storedSession);
      setRecentAliases(aliases);
      setIsLoading(false);
    }

    loadState();
  }, []);

  async function handleClearSession() {
    await clearStoredSession();
    setSession(undefined);
    await showToast({
      style: Toast.Style.Success,
      title: "Stored Session Cleared",
    });
  }

  async function handleClearRecentAliases() {
    await clearRecentAliases();
    setRecentAliases([]);
    await showToast({
      style: Toast.Style.Success,
      title: "Recent Aliases Cleared",
    });
  }

  async function generateAndCopy(token: string) {
    setIsGenerating(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating Alias",
      });
      const generated = await generateAddress(token);
      await Clipboard.copy(generated.fullAddress);
      const aliases = await saveRecentAlias(generated);
      setRecentAliases(aliases);
      await showToast({
        style: Toast.Style.Success,
        title: "Alias Copied",
        message: generated.fullAddress,
      });
    } catch (error) {
      await showToast(
        getToastOptions(
          error,
          isDdgApiError(error) && error.status === 401
            ? handleClearSession
            : undefined,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSetupSubmit(values: SetupFormValues) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Signing In" });
      const loginResult = await loginWithOtp(values.username, values.otp);
      const dashboard = await getDashboard(loginResult.token);
      const accessTokenFromDashboard = dashboard.user?.access_token;

      if (!accessTokenFromDashboard) {
        throw new Error(
          "The dashboard response did not include an access token.",
        );
      }

      const nextSession: StoredSession = {
        accessToken: accessTokenFromDashboard,
        username: dashboard.user?.username || values.username,
        email: dashboard.user?.email,
        updatedAt: new Date().toISOString(),
      };

      await saveStoredSession(nextSession);
      setSession(nextSession);
      await generateAndCopy(accessTokenFromDashboard);
    } catch (error) {
      await showToast(getToastOptions(error));
    }
  }

  if (isLoading) {
    return <List isLoading />;
  }

  if (!accessToken) {
    return (
      <SetupForm
        defaultUsername={preferences.duckAddress || session?.username}
        onSubmit={handleSetupSubmit}
      />
    );
  }

  return (
    <List isLoading={isGenerating} searchBarPlaceholder="Search recent aliases">
      <List.Section title="Generate">
        <List.Item
          icon={Icon.PlusCircle}
          title="Generate New Duck Address"
          subtitle="Creates a private alias and copies it to the clipboard"
          actions={
            <ActionPanel>
              <Action
                title="Generate New Alias"
                icon={Icon.Plus}
                onAction={() => generateAndCopy(accessToken)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Clear Stored Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleClearSession}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <RecentAliases
        aliases={recentAliases}
        onGenerate={() => generateAndCopy(accessToken)}
        onClearRecentAliases={handleClearRecentAliases}
        onClearSession={handleClearSession}
      />
    </List>
  );
}
