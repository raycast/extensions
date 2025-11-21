import { Action, ActionPanel, Icon, List, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { getSonarrUrl } from "@/lib/utils/formatting";
import { testConnection, useSystemStatus, useHealth } from "@/lib/hooks/useSonarrAPI";
import { HealthCheckType } from "@/lib/types/system";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { host, port, http } = preferences;
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const { data: systemStatus } = useSystemStatus();
  const { data: healthChecks } = useHealth();

  const sonarrUrl = getSonarrUrl();

  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testConnection();
      setConnectionStatus({
        success: result.success,
        message: result.message,
        version: result.status?.version,
      });
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusIcon = connectionStatus?.success ? Icon.CheckCircle : Icon.XMarkCircle;
  const statusColor = connectionStatus?.success ? Color.Green : Color.Red;

  const errors = healthChecks?.filter((check) => check.type === HealthCheckType.Error) || [];
  const warnings = healthChecks?.filter((check) => check.type === HealthCheckType.Warning) || [];
  const hasIssues = errors.length > 0 || warnings.length > 0;

  const quickActions = (
    <ActionPanel.Section title="Quick Actions">
      <Action.OpenInBrowser title="Open Series Library" url={sonarrUrl} icon={Icon.List} />
      <Action.OpenInBrowser title="Open Calendar" url={`${sonarrUrl}/calendar`} icon={Icon.Calendar} />
      <Action.OpenInBrowser title="Open Queue" url={`${sonarrUrl}/queue`} icon={Icon.Download} />
    </ActionPanel.Section>
  );

  return (
    <List isLoading={isLoading}>
      <List.Section title="Sonarr Instance">
        <List.Item
          title="Connection Status"
          icon={{ source: statusIcon, tintColor: statusColor }}
          accessories={[
            {
              text: connectionStatus
                ? connectionStatus.success
                  ? `Connected (v${connectionStatus.version})`
                  : "Connection Failed"
                : "Not Tested",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Test Connection" icon={Icon.Network} onAction={handleTestConnection} />
              <Action.OpenInBrowser title="Open Sonarr" url={sonarrUrl} icon={Icon.Globe} />
              {quickActions}
            </ActionPanel>
          }
        />

        <List.Item
          title="Instance URL"
          subtitle={sonarrUrl}
          icon={Icon.Link}
          accessories={[{ text: `${host}:${port}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Sonarr" url={sonarrUrl} icon={Icon.Globe} />
              <Action.CopyToClipboard title="Copy URL" content={sonarrUrl} />
              {quickActions}
            </ActionPanel>
          }
        />

        <List.Item
          title="Protocol"
          subtitle={http.toUpperCase()}
          icon={http === "https" ? Icon.Lock : Icon.LockUnlocked}
          accessories={[{ text: http === "https" ? "Secure" : "Insecure" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Sonarr" url={sonarrUrl} icon={Icon.Globe} />
              {quickActions}
            </ActionPanel>
          }
        />

        {connectionStatus && (
          <List.Item
            title="Status Message"
            subtitle={connectionStatus.message}
            icon={Icon.Info}
            accessories={[{ text: connectionStatus.success ? "✅" : "❌" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Sonarr" url={sonarrUrl} icon={Icon.Globe} />
                {quickActions}
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {systemStatus && (
        <List.Section title="System Health">
          <List.Item
            title="Sonarr Version"
            subtitle={systemStatus.version}
            icon={Icon.Info}
            accessories={[{ text: systemStatus.osName }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open System Status" url={`${sonarrUrl}/system/status`} icon={Icon.Globe} />
                {quickActions}
              </ActionPanel>
            }
          />

          <List.Item
            title="Health Status"
            subtitle={
              hasIssues
                ? `${errors.length} error${errors.length !== 1 ? "s" : ""}, ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`
                : "All systems operational"
            }
            icon={hasIssues ? Icon.ExclamationMark : Icon.CheckCircle}
            accessories={[
              {
                tag: {
                  value: hasIssues ? "Issues Found" : "Healthy",
                  color: hasIssues ? (errors.length > 0 ? Color.Red : Color.Orange) : Color.Green,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open System Status" url={`${sonarrUrl}/system/status`} icon={Icon.Globe} />
                {quickActions}
              </ActionPanel>
            }
          />

          {errors.map((error) => (
            <List.Item
              key={error.source}
              title={error.message}
              subtitle={error.source}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              accessories={[{ tag: { value: "Error", color: Color.Red } }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open System Status"
                    url={`${sonarrUrl}/system/status`}
                    icon={Icon.Globe}
                  />
                  {quickActions}
                </ActionPanel>
              }
            />
          ))}

          {warnings.map((warning) => (
            <List.Item
              key={warning.source}
              title={warning.message}
              subtitle={warning.source}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              accessories={[{ tag: { value: "Warning", color: Color.Orange } }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open System Status"
                    url={`${sonarrUrl}/system/status`}
                    icon={Icon.Globe}
                  />
                  {quickActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
