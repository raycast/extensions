import {
  List,
  ActionPanel,
  Action,
  showToast,
  LocalStorage,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  Alert,
  confirmAlert,
  showHUD,
  Clipboard,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { apiServiceManager } from "./services/api-service";
import { STORAGE_KEYS } from "./constants";
import { logger } from "./utils/logger";

import { showFailureToast } from "@raycast/utils";

interface CredentialInfo {
  key: string;
  value: string;
  maskedValue: string;
  isValid: boolean;
}

function CredentialsContent() {
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function loadCredentialInfo() {
      try {
        const lastTested = await LocalStorage.getItem<string>("last-credential-test");
        setLastTestedAt(lastTested || null);

        const credentialData: CredentialInfo[] = [
          {
            key: "API Key",
            value: preferences.apiKey || "",
            maskedValue:
              preferences.apiKey && preferences.apiKey.trim()
                ? `${preferences.apiKey.substring(0, 8)}${"*".repeat(Math.max(0, preferences.apiKey.length - 12))}${preferences.apiKey.substring(Math.max(0, preferences.apiKey.length - 4))}`
                : "Not set",
            isValid: !!preferences.apiKey && preferences.apiKey.trim().length > 10,
          },
          {
            key: "Refresh Token",
            value: preferences.refreshToken || "",
            maskedValue:
              preferences.refreshToken && preferences.refreshToken.trim()
                ? `${preferences.refreshToken.substring(0, 8)}${"*".repeat(Math.max(0, preferences.refreshToken.length - 12))}${preferences.refreshToken.substring(Math.max(0, preferences.refreshToken.length - 4))}`
                : "Not set",
            isValid: !!preferences.refreshToken && preferences.refreshToken.trim().length > 10,
          },
        ];

        setCredentials(credentialData);
      } catch (error) {
        logger.error("Error loading credential info:", error);
        showFailureToast(error, {
          title: "Failed to load credential information",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCredentialInfo();
  }, [preferences.apiKey, preferences.refreshToken]);

  async function testCredentials() {
    try {
      setIsLoading(true);

      // Check if credentials are provided
      if (!preferences.apiKey?.trim() || !preferences.refreshToken?.trim()) {
        showFailureToast({
          title: "Missing Credentials",
          message: "Please set both API Key and Refresh Token in extension preferences",
        });
        return;
      }

      showToast({
        title: "Testing Credentials",
        message: "Validating your API credentials...",
        style: Toast.Style.Animated,
      });

      const apiService = apiServiceManager.getApiService(preferences);
      const now = new Date().toLocaleString();
      await LocalStorage.setItem("last-credential-test", now);
      setLastTestedAt(now);

      const accessToken = await apiService.getAccessToken();
      if (accessToken) {
        showToast({
          title: "Valid Credentials",
          message: "Authentication successful. Token expires in 24 hours.",
          style: Toast.Style.Success,
        });
      }
    } catch (error) {
      logger.error("Error testing credentials:", error);
      showFailureToast(error, {
        title: "Unable to connect to Atomberg API",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function clearCachedData() {
    const options: Alert.Options = {
      title: "Clear Cached Data",
      message: "This will clear cached access tokens and test history. Your API credentials will remain intact.",
      primaryAction: {
        title: "Clear Cache",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        await LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        await LocalStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        await LocalStorage.removeItem("last-credential-test");
        setLastTestedAt(null);
        showHUD("✅ Cached data cleared");
      } catch (error) {
        logger.error("Error clearing cached data:", error);
        showFailureToast({
          title: "Failed to clear cached data",
        });
      }
    }
  }

  async function copyCredentialToClipboard(credential: CredentialInfo) {
    try {
      await Clipboard.copy(credential.value);
      showHUD(`✅ ${credential.key} copied to clipboard`);
    } catch (error) {
      logger.error("Clipboard copy error:", error);
      showFailureToast(error, {
        title: `Failed to copy ${credential.key} to clipboard`,
      });
    }
  }

  const allCredentialsValid = credentials.every((cred) => cred.isValid);
  const hasCredentials = credentials.some((cred) => cred.value);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search credential information...">
      <List.Section title="Credential Status">
        {credentials.map((credential) => (
          <List.Item
            key={credential.key}
            title={credential.key}
            subtitle={credential.maskedValue}
            accessories={[
              {
                icon: credential.isValid ? Icon.CheckCircle : Icon.XMarkCircle,
                tooltip: credential.isValid ? "Valid credential" : "Invalid credential",
              },
            ]}
            actions={
              <ActionPanel>
                {credential.value && (
                  <Action
                    title="Copy to Clipboard"
                    onAction={() => copyCredentialToClipboard(credential)}
                    icon={Icon.Clipboard}
                  />
                )}
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Actions">
        {hasCredentials && (
          <List.Item
            title="Test Credentials"
            subtitle={lastTestedAt ? `Last tested: ${lastTestedAt}` : "Never tested"}
            icon={Icon.Network}
            accessories={[
              {
                icon: allCredentialsValid ? Icon.CheckCircle : Icon.ExclamationMark,
                tooltip: allCredentialsValid ? "All credentials valid" : "Check credentials",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Test Authentication" onAction={testCredentials} icon={Icon.Network} />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              </ActionPanel>
            }
          />
        )}

        <List.Item
          title="Clear Cached Data"
          subtitle="Remove cached access tokens and test history"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="Clear Cache"
                onAction={clearCachedData}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Manage Credentials"
          subtitle="Update or reset your API Key and Refresh Token"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Get API Keys"
          subtitle="Visit Atomberg Developer Portal"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Atomberg Developer Portal"
                url="https://developer.atomberg-iot.com/"
                icon={Icon.Globe}
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List.Section>

      {!hasCredentials && (
        <List.EmptyView
          icon={Icon.Key}
          title="No Credentials Configured"
          description="Set up your Atomberg API credentials to get started"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
              <Action.OpenInBrowser title="Get Api Keys" url="https://developer.atomberg-iot.com/" icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <CredentialsContent />
    </QueryClientProvider>
  );
}
