import React, { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";

import { getRadarrInstances, getActiveRadarrInstance } from "@/lib/types/config";
import { testConnection, useHealth } from "@/lib/hooks/useRadarrAPI";
import type { RadarrInstance } from "@/lib/types/config";

export default function InstanceStatus() {
  const [instances, setInstances] = useState<RadarrInstance[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean | undefined>>({});
  const [isLoading, setIsLoading] = useState(true);
  const activeInstance = (() => {
    try {
      return getActiveRadarrInstance();
    } catch (error) {
      console.error("Failed to get active instance:", error);
      return null;
    }
  })();

  useEffect(() => {
    const fetchInstanceData = async () => {
      try {
        const radarrInstances = getRadarrInstances();
        setInstances(radarrInstances);

        const results = await Promise.all(
          radarrInstances.map(async instance => {
            const isConnected = await testConnection(instance);
            return { name: instance.name, isConnected };
          }),
        );

        const statusMap: Record<string, boolean> = {};
        results.forEach(result => {
          statusMap[result.name] = result.isConnected;
        });
        setConnectionStatus(statusMap);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load instances:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: error instanceof Error ? error.message : "Failed to load Radarr configuration",
        });
        setIsLoading(false);
      }
    };

    fetchInstanceData();
  }, []);

  const handleTestConnection = async (instance: RadarrInstance) => {
    setConnectionStatus(prev => ({ ...prev, [instance.name]: undefined }));

    try {
      const isConnected = await testConnection(instance);
      setConnectionStatus(prev => ({ ...prev, [instance.name]: isConnected }));

      showToast({
        style: isConnected ? Toast.Style.Success : Toast.Style.Failure,
        title: isConnected ? "Connection Successful" : "Connection Failed",
        message: `${instance.name}: ${isConnected ? "API accessible" : "Cannot connect to API"}`,
      });
    } catch (error) {
      console.error("Connection test failed:", error);
      setConnectionStatus(prev => ({ ...prev, [instance.name]: false }));
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: `Failed to test connection to ${instance.name}`,
      });
    }
  };

  const getStatusIcon = (instanceName: string): { source: Icon; tintColor?: Color } => {
    const status = connectionStatus[instanceName];
    if (status === undefined) return { source: Icon.Clock, tintColor: Color.Orange };
    if (status === true) return { source: Icon.CheckCircle, tintColor: Color.Green };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  };

  const getStatusText = (instanceName: string): string => {
    const status = connectionStatus[instanceName];
    if (status === undefined) return "Testing...";
    if (status === true) return "Connected";
    return "Failed";
  };

  const InstanceListSection = ({ instance }: { instance: RadarrInstance }) => {
    const statusIcon = getStatusIcon(instance.name);
    const statusText = getStatusText(instance.name);
    const isCurrentlySelected = activeInstance?.name === instance.name;
    const isConnected = connectionStatus[instance.name] === true;

    const { data: healthChecks } = useHealth(isConnected ? instance : null);

    const errors = healthChecks?.filter(check => check.type === "error") || [];
    const warnings = healthChecks?.filter(check => check.type === "warning") || [];
    const hasIssues = errors.length > 0 || warnings.length > 0;

    const quickActions = (
      <ActionPanel.Section title="Quick Actions">
        <Action.OpenInBrowser title="View Movie Library" url={`${instance.url}/movie`} icon={Icon.Video} />
        <Action.OpenInBrowser title="View Queue" url={`${instance.url}/activity/queue`} icon={Icon.Download} />
        <Action.OpenInBrowser title="View Calendar" url={`${instance.url}/calendar`} icon={Icon.Calendar} />
      </ActionPanel.Section>
    );

    return (
      <List.Section key={instance.name} title={instance.name}>
        <List.Item
          icon={statusIcon}
          title={instance.name}
          subtitle={instance.url}
          accessories={[
            { text: statusText },
            ...(isCurrentlySelected ? [{ tag: { value: "Selected", color: Color.Green } }] : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Test Connection" icon={Icon.Network} onAction={() => handleTestConnection(instance)} />
                <Action.OpenInBrowser title="Open in Browser" url={instance.url} icon={Icon.Globe} />
              </ActionPanel.Section>
              {quickActions}
              <ActionPanel.Section>
                <Action.Open
                  title="Open Extension Preferences"
                  target="raycast://extensions/preferences"
                  icon={Icon.Gear}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />

        {isConnected && healthChecks && (
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
                <Action.OpenInBrowser
                  title="Open System Status"
                  url={`${instance.url}/system/status`}
                  icon={Icon.Globe}
                />
                {quickActions}
              </ActionPanel>
            }
          />
        )}

        {errors.map(error => (
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
                  url={`${instance.url}/system/status`}
                  icon={Icon.Globe}
                />
                {quickActions}
              </ActionPanel>
            }
          />
        ))}

        {warnings.map(warning => (
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
                  url={`${instance.url}/system/status`}
                  icon={Icon.Globe}
                />
                {quickActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Radarr instances...">
      {instances.length === 0 ? (
        <List.EmptyView
          title="No Radarr Instances Configured"
          description="Configure your Radarr instances in extension preferences"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open Extension Preferences"
                target="raycast://extensions/preferences"
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ) : (
        instances.map(instance => <InstanceListSection key={instance.name} instance={instance} />)
      )}
    </List>
  );
}
