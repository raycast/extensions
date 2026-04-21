import { ActionPanel, Action, Icon, List, Image, showToast, Toast, open, Form, useNavigation } from "@raycast/api";
import { execAwsm, getDefaultBrowserBundleId, openUrlWithBundleId, FIREFOX_BUNDLE_IDS } from "./shared";
import { useEffect, useState } from "react";

interface Profile {
  name: string;
  type: string;
  region: string;
  account_id: string;
  sso_account_id: string;
  sso_role_name: string;
  sso_session: string;
  mfa_serial: string;
  is_active: boolean;
}

function MfaForm({ profile, actionTitle, onSubmit }: { profile: Profile; actionTitle: string; onSubmit: (token: string) => void }) {
  const { pop } = useNavigation();
  const [tokenError, setTokenError] = useState<string | undefined>(undefined);

  return (
    <Form
      navigationTitle={`MFA for ${profile.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={actionTitle}
            onSubmit={(values: { token: string }) => {
              const token = values.token.trim();
              if (!/^\d{6}$/.test(token)) {
                setTokenError("Token must be a 6-digit number");
                return;
              }
              pop();
              onSubmit(token);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Profile "${profile.name}" requires MFA (${profile.mfa_serial})`} />
      <Form.TextField
        id="token"
        title="MFA Token"
        placeholder="123456"
        error={tokenError}
        onChange={() => setTokenError(undefined)}
        autoFocus
      />
    </Form>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [data, setData] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const loadProfiles = () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = execAwsm("profile list -j");
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const profiles: Profile[] | undefined = data
    ? (() => {
        try {
          return JSON.parse(data);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load profiles",
        message: String(error),
      });
    }
  }, [error]);

  const performSetProfile = async (profile: Profile, mfaToken?: string, afterSuccess?: () => Promise<void>): Promise<boolean> => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting profile...",
    });

    try {
      execAwsm(`profile set ${profile.name}`, mfaToken);
      loadProfiles();
      toast.style = Toast.Style.Success;
      toast.title = "Profile set";
      toast.message = profile.name;
      await afterSuccess?.();
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to set profile";
      toast.message = String(error);
      return false;
    }
  };

  const setProfile = async (profile: Profile): Promise<boolean> => {
    if (profile.mfa_serial) {
      // Try without MFA first—if cached session exists and is valid, awsm won't prompt
      try {
        execAwsm(`profile set ${profile.name}`);
        loadProfiles();
        await showToast({
          style: Toast.Style.Success,
          title: "Profile set",
          message: profile.name,
        });
        return true;
      } catch {
        // Session not cached or expired—prompt for MFA
        push(<MfaForm profile={profile} actionTitle="Set Profile" onSubmit={(token) => performSetProfile(profile, token)} />);
        return false;
      }
    }
    return performSetProfile(profile);
  };

  const openConsole = async (profile: Profile) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening console...",
    });

    try {
      const result = execAwsm(`console -n -p ${profile.name}`);
      const defaultBrowser = getDefaultBrowserBundleId();
      const isFirefoxDefault = defaultBrowser && FIREFOX_BUNDLE_IDS.includes(defaultBrowser);

      if (isFirefoxDefault) {
        const containerUrl = `ext+container:name=${encodeURIComponent(profile.name)}&url=${encodeURIComponent(result)}`;
        const bundleId = defaultBrowser as string;
        openUrlWithBundleId(containerUrl, bundleId);
      } else {
        open(result);
      }
      toast.hide();
    } catch (error) {
      // If MFA is required, show the form
      if (profile.mfa_serial) {
        toast.hide();
        push(<MfaForm profile={profile} actionTitle="Open Console" onSubmit={(token) => performSetProfile(profile, token, () => openConsole(profile))} />);
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open console";
      toast.message = String(error);
    }
  };

  const getFirefoxBundleId = (): string | undefined => {
    const defaultBrowser = getDefaultBrowserBundleId();
    if (defaultBrowser && FIREFOX_BUNDLE_IDS.includes(defaultBrowser)) {
      return defaultBrowser;
    }
    // Try to find any installed Firefox version
    // On macOS, we can check if the app exists, but for simplicity we can try the first one
    // or assume org.mozilla.firefox is common.
    // Ideally we should verify installation, but Raycast openUrlWithBundleId will fail gracefully or we can catch it.
    return "org.mozilla.firefox";
  };

  const openInFirefoxContainer = async (profile: Profile) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening in Firefox Container...",
    });

    try {
      const result = execAwsm(`console -n -p ${profile.name}`);
      const firefoxId = getFirefoxBundleId();

      if (firefoxId) {
        const containerUrl = `ext+container:name=${encodeURIComponent(profile.name)}&url=${encodeURIComponent(result)}`;
        openUrlWithBundleId(containerUrl, firefoxId);
        toast.hide();
      } else {
        throw new Error("Firefox not found");
      }
    } catch (error) {
      // If MFA is required, show the form
      if (profile.mfa_serial) {
        toast.hide();
        push(<MfaForm profile={profile} actionTitle="Open in Firefox Container" onSubmit={(token) => performSetProfile(profile, token, () => openInFirefoxContainer(profile))} />);
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open in Firefox";
      toast.message = String(error);
    }
  };

  const setProfileAndOpenConsoleInFirefox = async (profile: Profile) => {
    const success = await setProfile(profile);
    if (success) await openInFirefoxContainer(profile);
  };

  const setProfileAndOpenConsole = async (profile: Profile) => {
    const success = await setProfile(profile);
    if (success) await openConsole(profile);
  };

  // Group profiles by sso_session
  const groupedProfiles = profiles?.reduce<Record<string, Profile[]>>((acc, profile) => {
    const session = profile.sso_session || "No Session";
    if (!acc[session]) {
      acc[session] = [];
    }
    acc[session].push(profile);
    return acc;
  }, {});

  const sortedGroupEntries = groupedProfiles
    ? Object.entries(groupedProfiles).sort(([, aProfiles], [, bProfiles]) => {
        const aHasActive = aProfiles.some((p) => p.is_active);
        const bHasActive = bProfiles.some((p) => p.is_active);
        if (aHasActive && !bHasActive) return -1;
        if (!aHasActive && bHasActive) return 1;
        return 0;
      })
    : undefined;

  return (
    <List isLoading={isLoading}>
      {sortedGroupEntries &&
        sortedGroupEntries.map(([session, sessionProfiles]) => (
          <List.Section key={session} title={session}>
            {[...sessionProfiles].sort((a, b) => (a.is_active ? -1 : b.is_active ? 1 : 0)).map((profile) => (
              <List.Item
                key={profile.name}
                icon={
                  profile.is_active
                    ? {
                        source: {
                          light: "connected_light.png",
                          dark: "connected_dark.png",
                        },
                        mask: Image.Mask.Circle,
                      }
                    : {
                        source: {
                          light: "lastseen_light.png",
                          dark: "lastseen_dark.png",
                        },
                        mask: Image.Mask.Circle,
                      }
                }
                title={profile.name}
                subtitle={profile.sso_session}
                accessories={[{ icon: Icon.Globe, text: profile.region }]}
                actions={
                  <ActionPanel>
                    <Action title="Set Profile" icon={Icon.Checkmark} onAction={() => setProfile(profile)} />
                    <Action
                      title="Set Profile and Open Console"
                      icon={Icon.Bolt}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={() => setProfileAndOpenConsole(profile)}
                    />
                    <Action
                      title="Open Console"
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={() => openConsole(profile)}
                    />
                    <Action
                      title="Set Profile and Open Console in Firefox"
                      icon={Icon.Bird}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "f" }}
                      onAction={() => setProfileAndOpenConsoleInFirefox(profile)}
                    />
                    <Action
                      title="Open in Firefox Container"
                      icon={Icon.Bird}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={() => openInFirefoxContainer(profile)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Account ID"
                      icon={Icon.Clipboard}
                      content={profile.account_id}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
