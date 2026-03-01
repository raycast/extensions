import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { testConnection, useHealth, useSystemStatus } from "@/lib/hooks/useLidarrAPI";
import { getLidarrUrl } from "@/lib/utils/formatting";

export default function Command() {
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const { data: systemStatus } = useSystemStatus();
  const { data: healthChecks = [] } = useHealth();
  const lidarrUrl = getLidarrUrl();

  useEffect(() => {
    void handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testConnection();
      setConnectionStatus({
        success: result.success,
        message: result.message,
        version: result.status?.version,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const errors = healthChecks.filter((check) => check.type === "error");
  const warnings = healthChecks.filter((check) => check.type === "warning");

  return (
    <List isLoading={isTesting}>
      <List.Section title="Lidarr Instance">
        <List.Item
          title="Connection Status"
          subtitle={connectionStatus?.message || "Not tested"}
          icon={{
            source: connectionStatus?.success ? Icon.CheckCircle : Icon.XMarkCircle,
            tintColor: connectionStatus?.success ? Color.Green : Color.Red,
          }}
          actions={
            <ActionPanel>
              <Action title="Test Connection" icon={Icon.Network} onAction={handleTestConnection} />
              <Action.OpenInBrowser title="Open Lidarr" url={lidarrUrl} icon={Icon.Globe} />
              <Action.OpenInBrowser title="Open Artists" url={`${lidarrUrl}/artist`} icon={Icon.Music} />
              <Action.OpenInBrowser title="Open Queue" url={`${lidarrUrl}/queue`} icon={Icon.Download} />
            </ActionPanel>
          }
        />

        {systemStatus && (
          <List.Item
            title="Version"
            subtitle={systemStatus.version}
            accessories={[{ text: systemStatus.osName || "Unknown OS" }]}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open System Status" url={`${lidarrUrl}/system/status`} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        )}

        <List.Item
          title="Health Summary"
          subtitle={
            errors.length || warnings.length
              ? `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
              : "All systems operational"
          }
          icon={{
            source: errors.length ? Icon.XMarkCircle : warnings.length ? Icon.Warning : Icon.CheckCircle,
            tintColor: errors.length ? Color.Red : warnings.length ? Color.Orange : Color.Green,
          }}
        />
      </List.Section>

      {errors.length > 0 && (
        <List.Section title="Errors">
          {errors.map((error) => (
            <List.Item
              key={`${error.source}-${error.message}`}
              title={error.message}
              subtitle={error.source}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            />
          ))}
        </List.Section>
      )}

      {warnings.length > 0 && (
        <List.Section title="Warnings">
          {warnings.map((warning) => (
            <List.Item
              key={`${warning.source}-${warning.message}`}
              title={warning.message}
              subtitle={warning.source}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
