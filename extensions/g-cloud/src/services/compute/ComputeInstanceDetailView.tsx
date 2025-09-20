import {
  ActionPanel,
  Action,
  Icon,
  Color,
  Toast,
  showToast,
  confirmAlert,
  popToRoot,
  Alert,
  Detail,
  Clipboard,
} from "@raycast/api";
import { ComputeService, ComputeInstance } from "./ComputeService";
import { useMemo, useCallback } from "react";
import { showFailureToast } from "@raycast/utils";

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
}: ComputeInstanceDetailViewProps): JSX.Element {
  const zone = service.formatZone(instance.zone);
  const machineType = service.formatMachineType(instance.machineType);

  // Memoize status info to avoid re-rendering
  const statusInfo = useMemo(() => {
    const lowerStatus = instance.status.toLowerCase();
    let icon = { source: Icon.Circle, tintColor: Color.SecondaryText };
    let color: Color = Color.SecondaryText;

    if (lowerStatus === "running") {
      icon = { source: Icon.CircleFilled, tintColor: Color.Green };
      color = Color.Green;
    } else if (lowerStatus === "terminated" || lowerStatus === "stopped") {
      icon = { source: Icon.CircleFilled, tintColor: Color.Red };
      color = Color.Red;
    } else if (lowerStatus === "stopping" || lowerStatus === "starting") {
      icon = { source: Icon.CircleFilled, tintColor: Color.Orange };
      color = Color.Orange;
    }

    return (
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={instance.status} icon={icon} color={color} />
      </Detail.Metadata.TagList>
    );
  }, [instance.status]);

  // Memoize network interfaces to prevent re-renders
  const networkInterfaces = useMemo(() => {
    return instance.networkInterfaces.map((nic, index) => {
      return (
        <Detail.Metadata.Label
          key={`network-${index}`}
          title={`Interface ${index + 1}`}
          text={nic.networkIP}
          icon={{ source: Icon.Network }}
        />
      );
    });
  }, [instance.networkInterfaces]);

  // Memoize external IPs
  const externalIPs = useMemo(() => {
    return instance.networkInterfaces.map((nic, index) => {
      const externalIP = nic.accessConfigs?.find((config) => config.natIP)?.natIP;
      if (!externalIP) return null;

      return (
        <Detail.Metadata.Label
          key={`external-ip-${index}`}
          title={`External IP (Interface ${index + 1})`}
          text={externalIP}
          icon={{ source: Icon.Globe }}
        />
      );
    });
  }, [instance.networkInterfaces]);

  // Memoize disks information
  const disksInfo = useMemo(() => {
    return instance.disks.map((disk, index) => (
      <Detail.Metadata.Label
        key={`disk-${index}`}
        title={disk.deviceName}
        text={`${disk.type} (${disk.boot ? "Boot" : "Data"})`}
        icon={disk.boot ? { source: Icon.HardDrive, tintColor: Color.Green } : { source: Icon.HardDrive }}
      />
    ));
  }, [instance.disks]);

  // Memoize tags
  const tagsSection = useMemo(() => {
    if (!instance.tags?.items || instance.tags.items.length === 0) return null;

    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.TagList title="Tags">
          {instance.tags.items.map((tag, index) => {
            const colors = [Color.Blue, Color.Green, Color.Orange, Color.Purple, Color.Red];
            return <Detail.Metadata.TagList.Item key={tag} text={tag} color={colors[index % colors.length]} />;
          })}
        </Detail.Metadata.TagList>
      </>
    );
  }, [instance.tags?.items]);

  // Memoize labels
  const labelsSection = useMemo(() => {
    if (!instance.labels || Object.keys(instance.labels).length === 0) return null;

    return (
      <>
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label title="Labels" icon={{ source: Icon.Tag }} />
        {Object.entries(instance.labels).map(([key, value], index) => (
          <Detail.Metadata.Label key={`label-${index}`} title={key} text={value} />
        ))}
      </>
    );
  }, [instance.labels]);

  // Memoize the generated markdown content
  const markdown = useMemo(() => {
    let md = `# ${instance.name}\n\n`;

    // Show status as colored text with markdown
    md += `**Status:** \`${instance.status}\`\n\n`;

    // Machine type and created info with improved formatting
    md += `#### ${machineType} in ${zone} · Created ${new Date(instance.creationTimestamp).toLocaleString()}\n\n`;

    // Add quick access section for IPs
    md += `### Network Summary\n\n`;

    // Create a table for networks
    if (instance.networkInterfaces && instance.networkInterfaces.length > 0) {
      md += "| Interface | Internal IP | External IP | Network |\n";
      md += "|-----------|-------------|------------|----------|\n";

      instance.networkInterfaces.forEach((nic, index) => {
        const network = nic.network.split("/").pop() || "";
        const external = nic.accessConfigs?.find((config) => config.natIP)?.natIP || "-";
        md += `| Interface ${index + 1} | \`${nic.networkIP}\` | \`${external}\` | ${network} |\n`;
      });

      md += "\n";
    }

    // Add disks information in a table
    md += `### Storage\n\n`;

    if (instance.disks && instance.disks.length > 0) {
      md += "| Name | Type | Mode | Boot | Auto-delete |\n";
      md += "|------|------|---------|------|------------|\n";

      instance.disks.forEach((disk) => {
        md += `| ${disk.deviceName} | ${disk.type} | ${disk.mode} | ${disk.boot ? "Yes" : "No"} | ${disk.autoDelete ? "Yes" : "No"} |\n`;
      });

      md += "\n";
    }

    // Service accounts section with better formatting - using no emojis
    if (instance.serviceAccounts && instance.serviceAccounts.length > 0) {
      md += `## Service Accounts\n\n`;
      instance.serviceAccounts.forEach((sa) => {
        md += `### ${sa.email}\n\n`;
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
      (instance.tags?.items && instance.tags.items.length > 0) ||
      (instance.labels && Object.keys(instance.labels).length > 0)
    ) {
      md += `## Tags & Labels\n\n`;

      if (instance.tags?.items && instance.tags.items.length > 0) {
        md += `### Tags\n\n`;
        instance.tags.items.forEach((tag) => {
          md += `- \`${tag}\`\n`;
        });
        md += "\n";
      }

      if (instance.labels && Object.keys(instance.labels).length > 0) {
        md += `### Labels\n\n`;
        md += "| Key | Value |\n";
        md += "|-----|-------|\n";
        Object.entries(instance.labels).forEach(([key, value]) => {
          md += `| \`${key}\` | \`${value}\` |\n`;
        });
        md += "\n";
      }
    }

    // Add quick actions section at the bottom
    md += `---\n\n`;
    md += `**Tip:** Press ⌘+R to refresh instance details • Press ⌘+S to ${instance.status.toLowerCase() === "running" ? "stop" : "start"} instance\n`;

    return md;
  }, [instance, machineType, zone]);

  // Create action handlers with useCallback
  const copyInstanceName = useCallback(() => {
    Clipboard.copy(instance.name);
    showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
      message: instance.name,
    });
  }, [instance.name]);

  const copyExternalIP = useCallback(() => {
    const externalIP = instance.networkInterfaces[0].accessConfigs?.[0].natIP || "";
    Clipboard.copy(externalIP);
    showToast({
      style: Toast.Style.Success,
      title: "External IP copied",
      message: externalIP,
    });
  }, [instance.networkInterfaces]);

  const copyInternalIP = useCallback(() => {
    const internalIP = instance.networkInterfaces[0]?.networkIP;
    Clipboard.copy(internalIP);
    showToast({
      style: Toast.Style.Success,
      title: "Internal IP copied",
      message: internalIP,
    });
  }, [instance.networkInterfaces]);

  const handleStartInstance = useCallback(async () => {
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Starting ${instance.name}...`,
        message: `Zone: ${zone}`,
      });

      await service.startInstance(instance.name, zone);
      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: `Started ${instance.name}`,
        message: "The instance should be running soon",
      });

      await onRefresh();
      popToRoot();
    } catch (error) {
      showFailureToast(error, {
        title: `Failed to Start ${instance.name}`,
      });
    }
  }, [instance.name, zone, service, onRefresh]);

  const handleStopInstance = useCallback(async () => {
    const shouldProceed = await confirmAlert({
      title: `Stop ${instance.name}?`,
      message: "This will stop the virtual machine. Are you sure?",
      primaryAction: {
        title: "Stop",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldProceed) return;

    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: `Stopping ${instance.name}...`,
        message: `Zone: ${zone}`,
      });

      const result = await service.stopInstance(instance.name, zone);
      loadingToast.hide();

      if (result.success) {
        if (result.isTimedOut) {
          showToast({
            style: Toast.Style.Success,
            title: `Stopping ${instance.name}`,
            message: "The instance is in the process of stopping. This may take several minutes to complete.",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: `Stopped ${instance.name}`,
            message: "The instance has been stopped",
          });
        }

        await onRefresh();
        popToRoot();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to Stop ${instance.name}`,
          message: "An error occurred while trying to stop the VM",
        });
      }
    } catch (error) {
      showFailureToast(error, {
        title: `Failed to Stop ${instance.name}`,
      });
    }
  }, [instance.name, zone, service, onRefresh]);

  const copyConnectionCommand = useCallback(() => {
    const zoneName = zone.split("/").pop() || zone;
    const projectName = projectId || instance.id?.split("/")?.[1] || "";
    const command = `gcloud compute ssh --zone="${zoneName}" "${instance.name}" --project="${projectName}"`;

    Clipboard.copy(command);
    showToast({
      style: Toast.Style.Success,
      title: "Connection command copied",
      message: "Paste in your terminal to connect",
    });
  }, [instance, zone, projectId]);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Instance: ${instance.name}`}
      metadata={
        <Detail.Metadata>
          {/* Status */}
          {statusInfo}

          <Detail.Metadata.Separator />

          {/* Basic Information */}
          <Detail.Metadata.Label title="Machine Type" text={machineType} icon={{ source: Icon.Desktop }} />
          <Detail.Metadata.Label title="Zone" text={zone} icon={{ source: Icon.Globe }} />
          <Detail.Metadata.Label title="CPU Platform" text={instance.cpuPlatform} icon={{ source: Icon.Terminal }} />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(instance.creationTimestamp).toLocaleString()}
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
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Copy Instance Name"
              icon={Icon.Clipboard}
              onAction={copyInstanceName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP && (
              <Action title="Copy External Ip" icon={Icon.Globe} onAction={copyExternalIP} />
            )}
            {instance.networkInterfaces?.[0]?.networkIP && (
              <Action title="Copy Internal Ip" icon={Icon.Network} onAction={copyInternalIP} />
            )}
          </ActionPanel.Section>

          {instance.status.toLowerCase() === "running" && (
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
            {instance.status.toLowerCase() === "running" ? (
              <Action
                title="Stop Instance"
                icon={{ source: Icon.Stop, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={handleStopInstance}
              />
            ) : (
              instance.status.toLowerCase() !== "starting" && (
                <Action
                  title="Start Instance"
                  icon={{ source: Icon.Play, tintColor: Color.Green }}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={handleStartInstance}
                />
              )
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
