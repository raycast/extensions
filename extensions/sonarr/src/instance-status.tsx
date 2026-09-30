import { Action, ActionPanel, Icon, List, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { InstanceActions } from "@/lib/components/InstanceActions";
import { useInstance } from "@/lib/hooks/useInstance";
import { testConnection, useSystemStatus, useHealth } from "@/lib/hooks/useSonarrAPI";
import type { InstanceState, SonarrInstance } from "@/lib/types/instance";
import { HealthCheckType } from "@/lib/types/system";
import { getSecondaryInstanceIssue } from "@/lib/utils/connection";

interface ConnectionResult {
  success: boolean;
  message: string;
  version?: string;
}

export default function Command() {
  const instanceState = useInstance();
  const { instances, instance: activeInstance, isLoading } = instanceState;
  const secondaryIssue = getSecondaryInstanceIssue();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Sonarr instances...">
      {instances.map((instance) => (
        <InstanceSection
          key={instance.id}
          instance={instance}
          isActive={instance.id === activeInstance?.id}
          instanceState={instanceState}
        />
      ))}

      {secondaryIssue && (
        <List.Section title="Second Instance">
          <List.Item
            title="Second Instance Not Usable"
            subtitle={secondaryIssue}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            accessories={[{ tag: { value: "Incomplete", color: Color.Orange } }]}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function InstanceSection({
  instance,
  isActive,
  instanceState,
}: {
  instance: SonarrInstance;
  isActive: boolean;
  instanceState: InstanceState;
}) {
  const [manualResult, setManualResult] = useState<ConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const isMountedRef = useRef(true);

  // Both instances are queried here, so a failing one must not raise a toast on
  // top of the status it already reports in the list.
  const {
    data: systemStatus,
    error: systemStatusError,
    isLoading: isStatusLoading,
  } = useSystemStatus(instance, {
    showErrorToast: false,
  });
  const { data: healthChecks } = useHealth(instance, { showErrorToast: false });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // The initial verdict reuses the `/system/status` request this section
  // already makes, instead of firing a second one with its own retry budget —
  // an unreachable second instance would otherwise spin for the best part of a
  // minute before saying so.
  const connection: ConnectionResult | null =
    manualResult ??
    (systemStatus
      ? { success: true, message: `Connected to Sonarr v${systemStatus.version}`, version: systemStatus.version }
      : systemStatusError
        ? { success: false, message: systemStatusError.message }
        : null);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setManualResult(null);

    try {
      // An explicit test is interactive: report the first failure rather than
      // retrying behind a spinner.
      const result = await testConnection(instance, { retries: 0 });

      if (isMountedRef.current) {
        setManualResult({ success: result.success, message: result.message, version: result.status?.version });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setManualResult({
          success: false,
          message: error instanceof Error ? error.message : "Connection test failed",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsTesting(false);
      }
    }
  }, [instance]);

  const isBusy = isTesting || (!manualResult && isStatusLoading);
  const statusIcon = isBusy ? Icon.Clock : connection?.success ? Icon.CheckCircle : Icon.XMarkCircle;
  const statusColor = isBusy ? Color.SecondaryText : connection?.success ? Color.Green : Color.Red;
  const statusText = isBusy
    ? "Testing…"
    : connection
      ? connection.success
        ? `Connected (v${connection.version})`
        : "Connection Failed"
      : "Not Tested";

  const isSecure = instance.url.startsWith("https://");
  const errors = healthChecks?.filter((check) => check.type === HealthCheckType.Error) || [];
  const warnings = healthChecks?.filter((check) => check.type === HealthCheckType.Warning) || [];
  const hasIssues = errors.length > 0 || warnings.length > 0;

  const instanceActions = (
    <>
      <ActionPanel.Section title="Instance Actions">
        <Action title="Test Connection" icon={Icon.Network} onAction={handleTestConnection} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Quick Actions">
        <Action.OpenInBrowser title="Open Sonarr" url={instance.url} icon={Icon.Globe} />
        <Action.OpenInBrowser title="Open Calendar" url={`${instance.url}/calendar`} icon={Icon.Calendar} />
        <Action.OpenInBrowser title="Open Queue" url={`${instance.url}/activity/queue`} icon={Icon.Download} />
        <Action.CopyToClipboard title="Copy URL" content={instance.url} />
      </ActionPanel.Section>

      <InstanceActions state={instanceState} />
    </>
  );

  return (
    <List.Section title={instance.name} subtitle={isActive ? "Active" : undefined}>
      <List.Item
        title="Connection Status"
        icon={{ source: statusIcon, tintColor: statusColor }}
        accessories={[{ text: statusText }]}
        actions={<ActionPanel>{instanceActions}</ActionPanel>}
      />

      <List.Item
        title="Instance URL"
        subtitle={instance.url}
        icon={Icon.Link}
        accessories={[{ tag: { value: isSecure ? "HTTPS" : "HTTP", color: isSecure ? Color.Green : Color.Orange } }]}
        actions={<ActionPanel>{instanceActions}</ActionPanel>}
      />

      {connection && !connection.success && (
        <List.Item
          title="Status Message"
          subtitle={connection.message}
          icon={{ source: Icon.Info, tintColor: Color.Red }}
          actions={<ActionPanel>{instanceActions}</ActionPanel>}
        />
      )}

      {systemStatus && (
        <List.Item
          title="Sonarr Version"
          subtitle={systemStatus.version}
          icon={Icon.Info}
          accessories={[{ text: systemStatus.osName }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open System Status"
                url={`${instance.url}/system/status`}
                icon={Icon.Globe}
              />
              {instanceActions}
            </ActionPanel>
          }
        />
      )}

      {healthChecks && (
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
              {instanceActions}
            </ActionPanel>
          }
        />
      )}

      {[...errors, ...warnings].map((check) => {
        const isError = check.type === HealthCheckType.Error;

        return (
          <List.Item
            key={`${instance.id}-${check.source}-${check.message}`}
            title={check.message}
            subtitle={check.source}
            icon={{
              source: isError ? Icon.XMarkCircle : Icon.Warning,
              tintColor: isError ? Color.Red : Color.Orange,
            }}
            accessories={[{ tag: { value: isError ? "Error" : "Warning", color: isError ? Color.Red : Color.Orange } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open System Status"
                  url={`${instance.url}/system/status`}
                  icon={Icon.Globe}
                />
                {instanceActions}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
