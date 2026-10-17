import {
  ActionPanel,
  Action,
  Icon,
  Color,
  Toast,
  showToast,
  confirmAlert,
  Alert,
  Detail,
  Clipboard,
  Keyboard,
} from "@raycast/api";
import { ComputeService, ComputeInstance } from "./ComputeService";
import { ReactElement, useMemo, useCallback, useEffect, useState } from "react";
import { useStreamerMode } from "../../utils/useStreamerMode";
import { maskIPIfEnabled, maskEmailIfEnabled } from "../../utils/maskSensitiveData";
import { StreamerModeAction } from "../../components/StreamerModeAction";
import { friendlyErrorMessage } from "../../utils/errorMessages";
import {
  ComputeLifecycleAction,
  getInstanceLifecycleActions,
  getInstanceStatusPresentation,
  getInstanceTip,
  getLifecycleActionConfirmation,
  getLifecycleActionFailureTitle,
  getLifecycleActionProgressToast,
  getLifecycleActionSuccessToast,
  getOptimisticStatusForAction,
} from "./instanceLifecycle";

interface ComputeInstanceDetailViewProps {
  instance: ComputeInstance;
  service: ComputeService;
  onRefresh: () => Promise<void>;
  projectId?: string;
}

export default function ComputeInstanceDetailView({
  instance,
  service,
  onRefresh,
  projectId,
}: ComputeInstanceDetailViewProps): ReactElement {
  const [currentInstance, setCurrentInstance] = useState(instance);
  const { isEnabled: isStreamerMode } = useStreamerMode();
  const zone = service.formatZone(currentInstance.zone);
  const machineType = service.formatMachineType(currentInstance.machineType);
  const lifecycleActions = getInstanceLifecycleActions(currentInstance.status);

  useEffect(() => {
    setCurrentInstance(instance);
  }, [instance]);

  // Memoize status info to avoid re-rendering
  const statusInfo = useMemo(() => {
    const presentation = getInstanceStatusPresentation(currentInstance.status);
    const icon = { source: presentation.icon, tintColor: presentation.color };

    return (
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={presentation.text} icon={icon} color={presentation.color} />
      </Detail.Metadata.TagList>
    );
  }, [currentInstance.status]);

  // Memoize network interfaces to prevent re-renders
  const networkInterfaces = useMemo(() => {
    return currentInstance.networkInterfaces.map((nic, index) => {
      return (
        <Detail.Metadata.Label
          key={`network-${index}`}
          title={`Interface ${index + 1}`}
          text={maskIPIfEnabled(nic.networkIP, isStreamerMode)}
          icon={{ source: Icon.Network }}
        />
      );
    });
  }, [currentInstance.networkInterfaces, isStreamerMode]);

  // Memoize external IPs
  const externalIPs = useMemo(() => {
    return currentInstance.networkInterfaces.map((nic, index) => {
      const externalIP = nic.accessConfigs?.find((config) => config.natIP)?.natIP;
      if (!externalIP) return null;

      return (
        <Detail.Metadata.Label
          key={`external-ip-${index}`}
          title={`External IP (Interface ${index + 1})`}
          text={maskIPIfEnabled(externalIP, isStreamerMode)}
          icon={{ source: Icon.Globe }}
        />
      );
    });
  }, [currentInstance.networkInterfaces, isStreamerMode]);

  // Memoize disks information
  const disksInfo = useMemo(() => {
    return currentInstance.disks.map((disk, index) => (
      <Detail.Metadata.Label
        key={`disk-${index}`}
        title={disk.deviceName}
        text={`${disk.type} (${disk.boot ? "Boot" : "Data"})`}
        icon={disk.boot ? { source: Icon.HardDrive, tintColor: Color.Green } : { source: Icon.HardDrive }}
      />
    ));
  }, [currentInstance.disks]);

  // Memoize tags
  const tagsSection = useMemo(() => {
    if (!currentInstance.tags?.items || currentInstance.tags.items.length === 0) return null;

    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.TagList title="Tags">
          {currentInstance.tags.items.map((tag, index) => {
            const colors = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Red];
            return <Detail.Metadata.TagList.Item key={tag} text={tag} color={colors[index % colors.length]} />;
          })}
        </Detail.Metadata.TagList>
      </>
    );
  }, [currentInstance.tags?.items]);

  // Memoize labels
  const labelsSection = useMemo(() => {
    if (!currentInstance.labels || Object.keys(currentInstance.labels).length === 0) return null;

    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label title="Labels" icon={{ source: Icon.Tag }} />
        {Object.entries(currentInstance.labels).map(([key, value], index) => (
          <Detail.Metadata.Label key={`label-${index}`} title={key} text={value} />
        ))}
      </>
    );
  }, [currentInstance.labels]);

  // Memoize the generated markdown content
  const markdown = useMemo(() => {
    let md = `# ${currentInstance.name}\n\n`;

    // Show status as colored text with markdown
    md += `**Status:** \`${currentInstance.status}\`\n\n`;

    // Machine type and created info with improved formatting
    md += `#### ${machineType} in ${zone} · Created ${new Date(currentInstance.creationTimestamp).toLocaleString()}\n\n`;

    // Add quick access section for IPs
    md += `### Network Summary\n\n`;

    // Create a table for networks
    if (currentInstance.networkInterfaces && currentInstance.networkInterfaces.length > 0) {
      md += "| Interface | Internal IP | External IP | Network |\n";
      md += "|-----------|-------------|------------|----------|\n";

      currentInstance.networkInterfaces.forEach((nic, index) => {
        const network = nic.network.split("/").pop() || "";
        const external = nic.accessConfigs?.find((config) => config.natIP)?.natIP || "-";
        const maskedInternal = maskIPIfEnabled(nic.networkIP, isStreamerMode);
        const maskedExternal = external === "-" ? "-" : maskIPIfEnabled(external, isStreamerMode);
        md += `| Interface ${index + 1} | \`${maskedInternal}\` | \`${maskedExternal}\` | ${network} |\n`;
      });

      md += "\n";
    }

    // Add disks information in a table
    md += `### Storage\n\n`;

    if (currentInstance.disks && currentInstance.disks.length > 0) {
      md += "| Name | Type | Mode | Boot | Auto-delete |\n";
      md += "|------|------|---------|------|------------|\n";

      currentInstance.disks.forEach((disk) => {
        md += `| ${disk.deviceName} | ${disk.type} | ${disk.mode} | ${disk.boot ? "Yes" : "No"} | ${disk.autoDelete ? "Yes" : "No"} |\n`;
      });

      md += "\n";
    }

    // Service accounts section with better formatting - using no emojis
    if (currentInstance.serviceAccounts && currentInstance.serviceAccounts.length > 0) {
      md += `## Service Accounts\n\n`;
      currentInstance.serviceAccounts.forEach((sa) => {
        md += `### ${maskEmailIfEnabled(sa.email, isStreamerMode)}\n\n`;
        md += "| Scope | Description |\n";
        md += "|-------|-------------|\n";
        sa.scopes.forEach((scope) => {
          // Map common scopes to more readable names
          let description = "";
          if (scope.includes("compute")) description = "Compute Engine";
          else if (scope.includes("storage")) description = "Cloud Storage";
          else if (scope.includes("logging")) description = "Cloud Logging";
          else if (scope.includes("monitoring")) description = "Cloud Monitoring";
          else if (scope.includes("sql")) description = "Cloud SQL";
          else if (scope.includes("cloud-platform")) description = "All Cloud APIs";
          else description = "API Access";

          md += `| \`${scope}\` | ${description} |\n`;
        });
        md += "\n";
      });
    }

    // Tags and labels section
    if (
      (currentInstance.tags?.items && currentInstance.tags.items.length > 0) ||
      (currentInstance.labels && Object.keys(currentInstance.labels).length > 0)
    ) {
      md += `## Tags & Labels\n\n`;

      if (currentInstance.tags?.items && currentInstance.tags.items.length > 0) {
        md += `### Tags\n\n`;
        currentInstance.tags.items.forEach((tag) => {
          md += `- \`${tag}\`\n`;
        });
        md += "\n";
      }

      if (currentInstance.labels && Object.keys(currentInstance.labels).length > 0) {
        md += `### Labels\n\n`;
        md += "| Key | Value |\n";
        md += "|-----|-------|\n";
        Object.entries(currentInstance.labels).forEach(([key, value]) => {
          md += `| \`${key}\` | \`${value}\` |\n`;
        });
        md += "\n";
      }
    }

    // Add quick actions section at the bottom
    md += `---\n\n`;
    md += `**Tip:** ${getInstanceTip(currentInstance.status)}\n`;

    return md;
  }, [currentInstance, machineType, zone, isStreamerMode]);

  // Create action handlers with useCallback
  const copyInstanceName = useCallback(() => {
    Clipboard.copy(currentInstance.name);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: currentInstance.name,
    });
  }, [currentInstance.name]);

  const copyExternalIP = useCallback(() => {
    const externalIP = currentInstance.networkInterfaces[0].accessConfigs?.[0].natIP || "";
    Clipboard.copy(externalIP);
    showToast({
      style: Toast.Style.Success,
      title: "External IP copied",
      message: externalIP,
    });
  }, [currentInstance.networkInterfaces]);

  const copyInternalIP = useCallback(() => {
    const internalIP = currentInstance.networkInterfaces[0]?.networkIP;
    Clipboard.copy(internalIP);
    showToast({
      style: Toast.Style.Success,
      title: "Internal IP copied",
      message: internalIP,
    });
  }, [currentInstance.networkInterfaces]);

  const refreshCurrentInstance = useCallback(
    async (showRefreshToast = false) => {
      let loadingToast: Promise<{ hide: () => void }> | undefined;
      if (showRefreshToast) {
        loadingToast = showToast({
          style: Toast.Style.Animated,
          title: "Refreshing instance details...",
          message: currentInstance.name,
        });
      }

      try {
        const latestInstance = await service.getInstance(currentInstance.name, zone, { forceRefresh: true });
        if (latestInstance) {
          setCurrentInstance(latestInstance);
        }
        await onRefresh();

        if (showRefreshToast) {
          (await loadingToast)?.hide();
          showToast({
            style: Toast.Style.Success,
            title: "Instance refreshed",
            message: currentInstance.name,
          });
        }
      } catch (error) {
        if (showRefreshToast) {
          (await loadingToast)?.hide();
        }
        throw error;
      }
    },
    [currentInstance.name, onRefresh, service, zone],
  );

  const executeLifecycleAction = useCallback(
    (action: ComputeLifecycleAction) => {
      switch (action) {
        case "start":
          return service.startInstance(currentInstance.name, zone);
        case "resume":
          return service.resumeInstance(currentInstance.name, zone);
        case "stop":
          return service.stopInstance(currentInstance.name, zone);
        case "suspend":
          return service.suspendInstance(currentInstance.name, zone);
        case "restart":
          return service.restartInstance(currentInstance.name, zone);
      }
    },
    [currentInstance.name, service, zone],
  );

  const handleLifecycleAction = useCallback(
    async (action: ComputeLifecycleAction) => {
      const confirmation = getLifecycleActionConfirmation(action, currentInstance.name);
      if (confirmation) {
        const shouldProceed = await confirmAlert({
          title: confirmation.title,
          message: confirmation.message,
          primaryAction: {
            title: confirmation.actionTitle,
            style: confirmation.isDestructive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
          },
        });

        if (!shouldProceed) return;
      }

      const previousInstance = currentInstance;

      try {
        setCurrentInstance((existing) => ({ ...existing, status: getOptimisticStatusForAction(action) }));

        const progressToast = getLifecycleActionProgressToast(action, currentInstance.name, zone);
        const loadingToast = await showToast({
          style: Toast.Style.Animated,
          title: progressToast.title,
          message: progressToast.message,
        });

        const result = await executeLifecycleAction(action);
        if (result.instance) {
          setCurrentInstance(result.instance);
        } else {
          await refreshCurrentInstance(false);
        }

        loadingToast.hide();

        const successToast = getLifecycleActionSuccessToast(action, currentInstance.name, result.isTimedOut);
        showToast({
          style: Toast.Style.Success,
          title: successToast.title,
          message: successToast.message,
        });

        await onRefresh();
      } catch (error) {
        setCurrentInstance(previousInstance);
        const friendly = friendlyErrorMessage(error, getLifecycleActionFailureTitle(action));
        showToast({
          style: Toast.Style.Failure,
          title: friendly.title,
          message: friendly.message,
        });
      }
    },
    [currentInstance, executeLifecycleAction, onRefresh, refreshCurrentInstance, zone],
  );

  const copyConnectionCommand = useCallback(() => {
    const zoneName = zone.split("/").pop() || zone;
    const projectName = projectId || currentInstance.id?.split("/")?.[1] || "";
    const command = `gcloud compute ssh --zone="${zoneName}" "${currentInstance.name}" --project="${projectName}"`;

    Clipboard.copy(command);
    showToast({
      style: Toast.Style.Success,
      title: "Connection command copied",
      message: "Paste in your terminal to connect",
    });
  }, [currentInstance, zone, projectId]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Instance: ${currentInstance.name}`}
      metadata={
        <Detail.Metadata>
          {/* Status */}
          {statusInfo}

          <Detail.Metadata.Separator />

          {/* Basic Information */}
          <Detail.Metadata.Label title="Machine Type" text={machineType} icon={{ source: Icon.Desktop }} />
          <Detail.Metadata.Label title="Zone" text={zone} icon={{ source: Icon.Globe }} />
          <Detail.Metadata.Label
            title="CPU Platform"
            text={currentInstance.cpuPlatform}
            icon={{ source: Icon.Terminal }}
          />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(currentInstance.creationTimestamp).toLocaleString()}
            icon={{ source: Icon.Calendar }}
          />

          <Detail.Metadata.Separator />

          {/* Network Information */}
          <Detail.Metadata.Label title="Network Interfaces" icon={{ source: Icon.Network }} />
          {networkInterfaces}

          {/* External IPs (shown separately for cleaner UI) */}
          {externalIPs}

          <Detail.Metadata.Separator />

          {/* Disks Information */}
          <Detail.Metadata.Label title="Disks" icon={{ source: Icon.HardDrive }} />
          {disksInfo}

          {/* Tags and Labels sections */}
          {tagsSection}
          {labelsSection}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Instance Actions">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => refreshCurrentInstance(true)}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
            <Action
              title="Copy Instance Name"
              icon={Icon.Clipboard}
              onAction={copyInstanceName}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {currentInstance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP && (
              <Action title="Copy External IP" icon={Icon.Globe} onAction={copyExternalIP} />
            )}
            {currentInstance.networkInterfaces?.[0]?.networkIP && (
              <Action title="Copy Internal IP" icon={Icon.Network} onAction={copyInternalIP} />
            )}
          </ActionPanel.Section>

          {currentInstance.status.toLowerCase() === "running" && (
            <ActionPanel.Section title="Connection">
              <Action
                title="Copy Connection Command"
                icon={Icon.Terminal}
                onAction={copyConnectionCommand}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section title="Power Actions">
            {lifecycleActions.map((action, index) => (
              <Action
                key={action.kind}
                title={action.title}
                icon={{ source: action.icon, tintColor: action.tintColor }}
                shortcut={
                  index === 0
                    ? { modifiers: ["cmd"], key: "s" }
                    : action.kind === "restart"
                      ? { modifiers: ["cmd", "shift"], key: "r" }
                      : { modifiers: ["cmd", "shift"], key: "s" }
                }
                onAction={() => handleLifecycleAction(action.kind)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Privacy">
            <StreamerModeAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
