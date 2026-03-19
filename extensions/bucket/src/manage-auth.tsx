import React from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  getPreferenceValues,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ConnectDevice from "./connect-device";
import { getAuthInfo } from "./lib/auth-utils";

type AuthSnapshot = Awaited<ReturnType<typeof getAuthInfo>>;

export default function ManageAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [authInfo, setAuthInfo] = useState<AuthSnapshot | null>(null);
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();

  const refreshAuth = useCallback(async () => {
    const info = await getAuthInfo();
    setAuthInfo(info);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const info = await getAuthInfo();
      if (!cancelled) {
        setAuthInfo(info);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDisconnectDevice() {
    const confirmed = await confirmAlert({
      title: "Disconnect Device",
      message: "Are you sure you want to disconnect this device? You'll need to reconnect to use Bucket.",
      primaryAction: {
        title: "Disconnect",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    await LocalStorage.removeItem("device-token");
    await LocalStorage.removeItem("user-email");
    await LocalStorage.removeItem("user-name");

    await showHUD("Device disconnected");
    await refreshAuth();
  }

  const deviceMethodActive = prefs.authMethod === "device";
  const apiMethodActive = prefs.authMethod === "apiKey";

  return (
    <List isLoading={isLoading}>
      <List.Section title="Authentication Status">
        {authInfo?.isAuthenticated ? (
          authInfo.method === "device" ? (
            <List.Item
              icon={{ source: Icon.CheckCircle, tintColor: "#00ff00" }}
              title="Device Connected"
              subtitle={authInfo.userEmail || "Connected"}
              accessories={[{ text: authInfo.userName || undefined }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Disconnect Device"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={handleDisconnectDevice}
                  />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              icon={{ source: Icon.CheckCircle, tintColor: "#00ff00" }}
              title="API Token Active"
              subtitle="You're signed in with an API token from preferences."
              actions={
                <ActionPanel>
                  <Action
                    title="Open Preferences"
                    icon={Icon.Gear}
                    onAction={() => {
                      showHUD("Open Raycast Preferences → Extensions → Bucket Bookmarks to manage your API token");
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          )
        ) : (
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: "#ff0000" }}
            title="Not Connected"
            subtitle={
              deviceMethodActive
                ? "Connect your device or switch to API token in preferences."
                : "Add an API token in preferences or switch to device connection."
            }
            actions={
              <ActionPanel>
                {deviceMethodActive && (
                  <Action title="Connect Device" icon={Icon.Link} onAction={() => push(<ConnectDevice />)} />
                )}
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    showHUD("Open Raycast Preferences → Extensions → Bucket Bookmarks");
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Authentication Methods">
        <List.Item
          icon={Icon.Link}
          title="Device Connection"
          subtitle="Secure pairing with web app"
          accessories={[
            {
              text: deviceMethodActive
                ? authInfo?.isAuthenticated && authInfo.method === "device"
                  ? "Connected"
                  : "Not connected"
                : "Not selected",
            },
          ]}
          actions={
            <ActionPanel>
              {deviceMethodActive && authInfo?.isAuthenticated && authInfo.method === "device" ? (
                <Action
                  title="Disconnect"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleDisconnectDevice}
                />
              ) : deviceMethodActive ? (
                <Action title="Connect Device" icon={Icon.Link} onAction={() => push(<ConnectDevice />)} />
              ) : (
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    showHUD("Select Device Connection under Authentication Method in extension preferences");
                  }}
                />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Key}
          title="API Token"
          subtitle="Long-lived authentication token"
          accessories={[
            {
              text: apiMethodActive
                ? authInfo?.isAuthenticated && authInfo.method === "apiKey"
                  ? "Configured"
                  : "Token missing"
                : "Not selected",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  showHUD("Open Raycast Preferences → Extensions → Bucket Bookmarks");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Help">
        <List.Item
          icon={Icon.QuestionMark}
          title="How to Get an API Token"
          subtitle="Create a token in the web app"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Web App" url="https://bucket.aevr.space/settings" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
