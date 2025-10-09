/**
 * Settings Command
 * Task 14: Configuration and preferences management
 */

import { ActionPanel, Action, List, Icon, getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getDaytonaClient, isDaytonaClientInitialized } from "./lib/daytona-client";
import { getCacheStats, clearAllCache } from "./utils/cache";

interface Preferences {
  apiKey: string;
}

// Define cache stats type
interface CacheStatsItem {
  exists: boolean;
  age?: number;
}

type CacheStats = Record<string, CacheStatsItem>;

function SettingsCommand() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({});
  const [clientStatus, setClientStatus] = useState<string>("checking");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "testing" | "connected" | "failed">("unknown");

  useEffect(() => {
    // Load preferences
    try {
      const prefs = getPreferenceValues<Preferences>();
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }

    // Check client status
    const isInitialized = isDaytonaClientInitialized();
    setClientStatus(isInitialized ? "initialized" : "not initialized");

    // Load cache stats
    setCacheStats(getCacheStats());
  }, []);

  const testConnection = async () => {
    setConnectionStatus("testing");

    try {
      const client = getDaytonaClient();
      // Test the connection with a real API call - list sandboxes (lightweight operation)
      await client.list();

      setConnectionStatus("connected");
      showToast({
        style: Toast.Style.Success,
        title: "Connection Successful",
        message: "Daytona API is responding correctly",
      });
    } catch (error) {
      setConnectionStatus("failed");
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unable to connect to Daytona API",
      });
    }
  };

  const handleClearCache = () => {
    clearAllCache();
    setCacheStats(getCacheStats());
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "testing":
        return Icon.ArrowClockwise;
      case "connected":
        return Icon.CheckCircle;
      case "failed":
        return Icon.XMarkCircle;
      default:
        return Icon.QuestionMark;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "testing":
        return "Testing...";
      case "connected":
        return "Connected";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  return (
    <List searchBarPlaceholder="Search settings...">
      <List.Section title="API Configuration">
        <List.Item
          title="API Key Status"
          subtitle={preferences?.apiKey ? "Configured" : "Not configured"}
          icon={preferences?.apiKey ? Icon.Key : Icon.LockDisabled}
          accessories={[{ text: preferences?.apiKey ? "Set in Preferences" : "Missing" }]}
        />

        <List.Item
          title="Connection Status"
          subtitle={getConnectionText()}
          icon={getConnectionIcon()}
          actions={
            <ActionPanel>
              <Action title="Test Connection" icon={Icon.Wifi} onAction={testConnection} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Account Management">
        <List.Item
          title="Billing & Spending"
          subtitle="View usage costs and billing information"
          icon={Icon.CreditCard}
          actions={
            <ActionPanel>
              <Action
                title="Open Billing Dashboard"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard/billing/spending")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Account Dashboard"
          subtitle="Access your main Daytona dashboard"
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action
                title="Open Dashboard"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Key Management"
          subtitle="Manage API keys and access tokens"
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Open Key Management"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard/keys")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Account Settings"
          subtitle="Manage your account preferences and profile"
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action
                title="Open Account Settings"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard/settings")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Usage Limits"
          subtitle="View usage limits and quotas"
          icon={Icon.BarChart}
          actions={
            <ActionPanel>
              <Action
                title="Open Usage Limits"
                icon={Icon.Globe}
                onAction={() => open("https://app.daytona.io/dashboard/limits")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="System Status">
        <List.Item
          title="Workspace Client"
          subtitle={clientStatus === "initialized" ? "Initialized" : "Not initialized"}
          icon={clientStatus === "initialized" ? Icon.CheckCircle : Icon.Circle}
          accessories={[{ text: clientStatus === "initialized" ? "Ready" : "Standby" }]}
        />
      </List.Section>

      <List.Section title="Cache Management">
        {Object.entries(cacheStats).map(([name, stats]) => (
          <List.Item
            key={name}
            title={`${name} Cache`}
            subtitle={stats.exists ? "Active" : "Empty"}
            icon={stats.exists ? Icon.HardDrive : Icon.Circle}
            accessories={[{ text: stats.age ? `${Math.round(stats.age / 1000)}s ago` : "N/A" }]}
          />
        ))}

        <List.Item
          title="Clear All Cache"
          subtitle="Remove all cached data"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="Clear Cache"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleClearCache}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Extension Info">
        <List.Item title="Architecture" subtitle="Multi-command with shared client singleton" icon={Icon.Building} />
        <List.Item title="Performance" subtitle="Optimized with caching and benchmarking" icon={Icon.Gauge} />
        <List.Item title="Commands Available" subtitle="9 specialized workspace commands" icon={Icon.List} />
      </List.Section>
    </List>
  );
}

export default SettingsCommand;
