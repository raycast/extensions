import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  open,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanAlertInfo } from "./shodan-api";

export default function MonitoredIPs() {
  console.log("🎯 MonitoredIPs component rendering");

  const [alerts, setAlerts] = useState<ShodanAlertInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shodanAPI = new ShodanAPI();
  console.log("🔧 ShodanAPI instance created");

  useEffect(() => {
    console.log("🚀 Monitored IPs component initialized");
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    console.log("🚀 Starting loadAlerts function");
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Loading monitored IP alerts...");
      console.log("📡 Making API call to getAlertInfo...");
      const startTime = Date.now();
      const alertData = await shodanAPI.getAlertInfo();
      const loadTime = Date.now() - startTime;

      console.log("📊 Raw API response:", alertData);
      console.log("📊 Response type:", typeof alertData);
      console.log("📊 Is array:", Array.isArray(alertData));
      console.log("📊 Response length:", alertData?.length);

      // The API returns a direct array of alerts
      if (!Array.isArray(alertData)) {
        console.warn("⚠️ API response is not an array:", alertData);
        setAlerts([]);
        showToast({
          style: Toast.Style.Success,
          title: "No alerts found",
          message: "API returned non-array response",
        });
        return;
      }

      const actualAlerts = alertData;

      console.log("✅ Alerts loaded successfully:", {
        count: actualAlerts.length,
        loadTime: `${loadTime}ms`,
        alerts: actualAlerts.map((alert) => ({
          id: alert.id,
          name: alert.name,
          ipCount: alert.filters?.ip?.length || 0,
          expires: alert.expires === 0 ? "Never" : new Date(alert.expires * 1000).toISOString(),
          notifiers: alert.notifiers?.length || 0,
          hasTriggers: alert.has_triggers,
        })),
      });

      setAlerts(actualAlerts);

      if (actualAlerts.length === 0) {
        console.log("📭 No alerts found - showing empty state");
        showToast({
          style: Toast.Style.Success,
          title: "No alerts found",
          message: "You don't have any IP alerts configured",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Alerts loaded",
          message: `Found ${actualAlerts.length} alert${actualAlerts.length !== 1 ? "s" : ""}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Error loading alerts:", {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString(),
        errorObject: err,
      });
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load alerts",
        message: errorMessage,
      });
    } finally {
      console.log("🏁 loadAlerts function completed");
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatExpiryDate = (expires: number) => {
    if (expires === 0) {
      return "Never expires";
    }

    const date = new Date(expires * 1000);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Expired";
    } else if (diffDays === 0) {
      return "Expires today";
    } else if (diffDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  const getExpiryColor = (expires: number) => {
    if (expires === 0) {
      return Color.Green; // Never expires is good
    }

    const date = new Date(expires * 1000);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return Color.Red;
    if (diffDays <= 7) return Color.Orange;
    return Color.Green;
  };

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.EmptyView title="Loading monitored IPs..." description="Check console for debug logs" />
      </List>
    );
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Failed to load alerts"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  console.log("🔄 Retrying to load alerts (from error state)...");
                  loadAlerts();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (alerts.length === 0) {
    return (
      <List>
        <List.Section title="Debug Information">
          <List.Item
            title="Debug: Check Console Logs"
            subtitle="Open terminal and run: npm run dev"
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action title="Open Terminal" icon={Icon.Terminal} onAction={() => open("terminal://")} />
              </ActionPanel>
            }
          />
        </List.Section>
        <List.EmptyView
          title="No Monitored IPs"
          description="You don't have any IP alerts configured. Create alerts in your Shodan account to monitor specific IPs."
          icon={Icon.Eye}
          actions={
            <ActionPanel>
              <Action
                title="Open Shodan Alerts"
                icon={Icon.Globe}
                onAction={() => {
                  console.log("🌐 Opening Shodan alerts page (from empty state)");
                  open("https://account.shodan.io/notifier");
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  console.log("🔄 Refreshing alerts (from empty state)...");
                  loadAlerts();
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isShowingDetail={true}>
      <List.Section title={`Monitored IPs (${alerts.length} alerts)`}>
        {alerts.map((alert) => (
          <List.Item
            key={alert.id}
            title={alert.name}
            icon={Icon.Eye}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Alert ID" text={alert.id} />
                    <List.Item.Detail.Metadata.Label title="IP Count" text={alert.filters.ip.length.toString()} />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatDate(alert.created)} />
                    <List.Item.Detail.Metadata.Label
                      title="Expires"
                      text={formatExpiryDate(alert.expires)}
                      icon={{ source: Icon.Clock, tintColor: getExpiryColor(alert.expires) }}
                    />
                    <List.Item.Detail.Metadata.Label title="Size" text={`${alert.size} bytes`} />
                    <List.Item.Detail.Metadata.Label title="Notifiers" text={alert.notifiers.length.toString()} />
                    <List.Item.Detail.Metadata.Label
                      title="Triggers"
                      text={alert.has_triggers ? "Enabled" : "Disabled"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Monitored IPs" text={alert.filters.ip.join(", ")} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Active Triggers"
                      text={Object.keys(alert.triggers)
                        .filter((key) => Object.keys(alert.triggers[key]).length > 0)
                        .map((trigger) => trigger.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
                        .join(", ")}
                    />
                    {alert.notifiers.length > 0 && (
                      <List.Item.Detail.Metadata.Label
                        title="Notification Methods"
                        text={alert.notifiers.map((n) => n.provider).join(", ")}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="View Ips"
                  icon={Icon.List}
                  onAction={() => {
                    console.log("📋 Viewing IPs for alert:", {
                      alertId: alert.id,
                      alertName: alert.name,
                      ipCount: alert.filters.ip.length,
                      ips: alert.filters.ip,
                    });

                    showToast({
                      style: Toast.Style.Success,
                      title: `IPs in ${alert.name}`,
                      message: alert.filters.ip.join(", "),
                    });
                  }}
                />
                <Action
                  title="Search Ips"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    const ipQuery = alert.filters.ip.map((ip: string) => `ip:${ip}`).join(" ");
                    console.log("🔍 Searching IPs for alert:", {
                      alertId: alert.id,
                      alertName: alert.name,
                      ipQuery: ipQuery,
                      ipCount: alert.filters.ip.length,
                    });

                    launchCommand({
                      name: "search-criteria",
                      type: LaunchType.UserInitiated,
                      arguments: { query: ipQuery },
                    });
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Alert ID"
                  content={alert.id}
                  onCopy={() => {
                    console.log("📋 Copied Alert ID:", alert.id);
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Ips"
                  content={alert.filters.ip.join(", ")}
                  onCopy={() => {
                    console.log("📋 Copied IPs:", {
                      alertId: alert.id,
                      ipCount: alert.filters.ip.length,
                      ips: alert.filters.ip,
                    });
                  }}
                />
                <Action
                  title="Open in Shodan"
                  icon={Icon.Globe}
                  onAction={() => {
                    console.log("🌐 Opening Shodan alerts page");
                    open("https://account.shodan.io/notifier");
                  }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    console.log("🔄 Refreshing alerts...");
                    loadAlerts();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
