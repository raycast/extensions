import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, showToast, Toast } from "@raycast/api";
import {
  CPU_THRESHOLDS,
  formatRAMUsage,
  getSourceColor,
  getSourceDisplayName,
  killProcess,
  MCPProcess,
  RAM_THRESHOLDS,
} from "../utils/mcp-detector";

interface MCPServerDetailProps {
  process: MCPProcess;
  onKill: () => void;
}

export default function MCPServerDetail({ process, onKill }: MCPServerDetailProps) {
  async function handleKillProcess(force = false) {
    const options: Alert.Options = {
      title: force ? "Force Kill MCP Server?" : "Kill MCP Server?",
      message: `Are you sure you want to ${force ? "force " : ""}kill "${process.name}" (PID: ${process.pid})?`,
      primaryAction: {
        title: force ? "Force Kill" : "Kill",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const success = killProcess(process.pid, force);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Process Killed",
          message: `${process.name} has been terminated`,
        });
        onKill();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Kill Process",
          message: force ? "Unable to force kill the process" : "Try force killing the process",
        });
      }
    }
  }

  const getRAMStatus = (ramMB: number): { text: string; color: string } => {
    if (ramMB >= RAM_THRESHOLDS.HIGH) return { text: "High", color: "🔴" };
    if (ramMB >= RAM_THRESHOLDS.MEDIUM) return { text: "Medium", color: "🟠" };
    if (ramMB >= RAM_THRESHOLDS.MODERATE) return { text: "Moderate", color: "🟡" };
    return { text: "Low", color: "🟢" };
  };

  const getCPUStatus = (cpuPercent: number): string => {
    if (cpuPercent > CPU_THRESHOLDS.HIGH) return "🔴 High";
    if (cpuPercent > CPU_THRESHOLDS.MEDIUM) return "🟠 Medium";
    return "🟢 Low";
  };

  const ramStatus = getRAMStatus(process.ramUsageMB);

  const markdown = `
# ${process.name}

## Overview

| Property | Value |
|----------|-------|
| **PID** | \`${process.pid}\` |
| **Source** | ${getSourceDisplayName(process.source)} |
| **Started** | ${process.startTime || "Unknown"} |

## Resource Usage

| Resource | Usage | Status |
|----------|-------|--------|
| **RAM** | ${formatRAMUsage(process.ramUsageMB)} (${process.ramPercentage.toFixed(2)}%) | ${ramStatus.color} ${ramStatus.text} |
| **CPU** | ${process.cpuPercentage.toFixed(2)}% | ${getCPUStatus(process.cpuPercentage)} |

## Command

\`\`\`bash
${process.fullCommand}
\`\`\`

${process.configPath ? `## Configuration\n\nLoaded from: \`${process.configPath}\`` : ""}

---

### Quick Actions

- Press **⌘K** to kill this process gracefully
- Press **⇧⌘K** to force kill this process
- Press **⌘C** to copy the PID
- Press **⇧⌘C** to copy the full command
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={process.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Process ID" text={process.pid.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Source">
            <Detail.Metadata.TagList.Item
              text={getSourceDisplayName(process.source)}
              color={getSourceColor(process.source)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="RAM Usage"
            text={`${formatRAMUsage(process.ramUsageMB)} (${process.ramPercentage.toFixed(1)}%)`}
          />
          <Detail.Metadata.Label title="CPU Usage" text={`${process.cpuPercentage.toFixed(1)}%`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Started" text={process.startTime || "Unknown"} />
          {process.configPath && (
            <Detail.Metadata.Link title="Config File" target={`file://${process.configPath}`} text="Open in Finder" />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action
              title="Kill Process"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={() => handleKillProcess(false)}
              shortcut={{ modifiers: ["cmd"], key: "k" }}
            />
            <Action
              title="Force Kill Process"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => handleKillProcess(true)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Process ID"
              content={process.pid.toString()}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Full Command"
              content={process.fullCommand}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard title="Copy Server Name" content={process.name} />
          </ActionPanel.Section>
          {process.configPath && (
            <ActionPanel.Section title="Config">
              <Action.OpenWith
                title="Open Config File"
                path={process.configPath}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.ShowInFinder title="Show Config in Finder" path={process.configPath} />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
