import React from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ConnectDevice from "./connect-device";

export default function ManageAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadAuthInfo();
  }, []);

  async function loadAuthInfo() {
    const token = await LocalStorage.getItem<string>("device-token");
    const email = await LocalStorage.getItem<string>("user-email");
    const name = await LocalStorage.getItem<string>("user-name");

    setDeviceToken(token || null);
    setUserEmail(email || null);
    setUserName(name || null);
    setIsLoading(false);
  }

  async function handleDisconnect() {
    const confirmed = await confirmAlert({
      title: "Disconnect Device",
      message:
        "Are you sure you want to disconnect this device? You'll need to reconnect to use Bucket.",
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
    loadAuthInfo();
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Authentication Status">
        {deviceToken ? (
          <List.Item
            icon={{ source: Icon.CheckCircle, tintColor: "#00ff00" }}
            title="Device Connected"
            subtitle={userEmail || "Connected"}
            accessories={[{ text: userName || undefined }]}
            actions={
              <ActionPanel>
                <Action
                  title="Disconnect Device"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleDisconnect}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: "#ff0000" }}
            title="Not Connected"
            subtitle="Connect your device or add an API token"
            actions={
              <ActionPanel>
                <Action
                  title="Connect Device"
                  icon={Icon.Link}
                  onAction={() => push(<ConnectDevice />)}
                />
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    // This will open Raycast preferences
                    showHUD(
                      "Open Raycast Preferences → Extensions → Bucket to add an API token",
                    );
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
          accessories={[{ text: deviceToken ? "Active" : "Not connected" }]}
          actions={
            <ActionPanel>
              {deviceToken ? (
                <Action
                  title="Disconnect"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleDisconnect}
                />
              ) : (
                <Action
                  title="Connect Device"
                  icon={Icon.Link}
                  onAction={() => push(<ConnectDevice />)}
                />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Key}
          title="API Token"
          subtitle="Long-lived authentication token"
          accessories={[{ text: "Configure in preferences" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  showHUD("Open Raycast Preferences → Extensions → Bucket");
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
              <Action.OpenInBrowser
                title="Open Web App"
                url="https://bucket.aevr.space/settings"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
