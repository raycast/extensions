import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getGatewayClient, resetGatewayClient } from "./lib/gateway-client";
import type {
  HealthResult,
  ChannelsStatusResult,
  ChannelAccountSnapshot,
} from "./lib/types";
import { getPreferences, getGatewayUrl } from "./lib/preferences";
import {
  getDeviceIdentity,
  getPublicKeyBase64Url,
  clearDeviceIdentity,
} from "./lib/device-identity";
import { formatLogsAsMarkdown, clearLogs } from "./lib/debug";

interface StatusState {
  loading: boolean;
  error?: string;
  health?: HealthResult;
  channels?: ChannelsStatusResult;
  connectedAt?: Date;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString();
}

function getChannelStatusIcon(account: ChannelAccountSnapshot): string {
  if (!account.configured) return "🔘";
  if (account.connected) return "🟢";
  if (account.error) return "🔴";
  return "🟡";
}

function getChannelStatusText(account: ChannelAccountSnapshot): string {
  if (!account.configured) return "Not configured";
  if (account.connected) return "Connected";
  if (account.error) return account.error;
  return account.status || "Unknown";
}

interface DeviceInfo {
  deviceId: string;
  publicKey: string;
}

export default function StatusCommand() {
  const [state, setState] = useState<StatusState>({ loading: true });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const { push } = useNavigation();

  const loadDeviceInfo = async () => {
    try {
      const identity = await getDeviceIdentity();
      const publicKey = getPublicKeyBase64Url(identity.publicKeyPem);
      setDeviceInfo({
        deviceId: identity.deviceId,
        publicKey,
      });
    } catch {
      // Ignore
    }
  };

  const loadStatus = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    await loadDeviceInfo();

    try {
      const client = getGatewayClient();
      await client.connect();

      const [health, channels] = await Promise.all([
        client.health(),
        client.channelsStatus(false),
      ]);

      setState({
        loading: false,
        health,
        channels,
        connectedAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setState({
        loading: false,
        error: message,
      });
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Failed",
        message: message.slice(0, 100),
      });
    }
  };

  const handleResetDevice = async () => {
    await clearDeviceIdentity();
    resetGatewayClient();
    setDeviceInfo(null);
    showToast({
      style: Toast.Style.Success,
      title: "Device Identity Cleared",
      message: "A new identity will be generated on next connect",
    });
    loadStatus();
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (state.loading) {
    let wsUrl = "(unknown)";
    try {
      wsUrl = getGatewayUrl();
    } catch {
      // Will show error state after loading
    }
    return (
      <Detail
        isLoading
        markdown={`Connecting to OpenClaw gateway...\n\n**URL**: \`${wsUrl}\``}
      />
    );
  }

  if (state.error) {
    const prefs = getPreferences();
    let wsUrl = "(unknown)";
    try {
      wsUrl = getGatewayUrl();
    } catch {
      // Ignore
    }

    const isDeviceIdentityError = state.error.includes("device identity");
    const isNotPairedError =
      state.error.includes("NOT_PAIRED") || state.error.includes("pairing");
    const isSignatureError = state.error.includes("signature");

    let troubleshooting = `
1. Make sure OpenClaw is running
2. For remote mode, enter the full URL (e.g., https://my-mac.tailnet-name.ts.net)
3. For local mode, check the port is correct (default: 18789)
4. Check if a password is required in Funnel mode
`;

    if (isNotPairedError) {
      troubleshooting = `
**This device needs to be paired with the gateway.**

Ask the gateway admin to approve this device:
- **Device ID**: \`${deviceInfo?.deviceId || "(loading...)"}\`

The admin should see a pairing request in the OpenClaw admin UI or logs.
`;
    } else if (isSignatureError) {
      troubleshooting = `
**Device signature verification failed.**

This can happen if:
1. The device identity was corrupted
2. The gateway's expected format changed
3. Clock skew between client and server

Try resetting the device identity using the action below.
`;
    } else if (isDeviceIdentityError) {
      troubleshooting = `
**Remote connections require device identity.**

Your device identity:
- **Device ID**: \`${deviceInfo?.deviceId || "(loading...)"}\`
- **Public Key**: \`${deviceInfo?.publicKey?.slice(0, 32) || "(loading...)"}...\`

If this is a new device, the admin needs to approve pairing.
`;
    }

    const debugLogs = formatLogsAsMarkdown();

    const errorMd = `
# Connection Error

**Failed to connect to OpenClaw gateway**

\`\`\`
${state.error}
\`\`\`

## Configuration

- **Mode**: ${prefs.connectionMode}
- **URL**: \`${wsUrl}\`
- **Device ID**: \`${deviceInfo?.deviceId || "(unknown)"}\`

## Troubleshooting

${troubleshooting}

## Debug Logs

${debugLogs}
`;
    return (
      <Detail
        markdown={errorMd}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={loadStatus}
            />
            <Action
              title="Reset Device Identity"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={handleResetDevice}
            />
            <Action.CopyToClipboard
              title="Copy Device Id"
              content={deviceInfo?.deviceId || ""}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="View Debug Logs"
              icon={Icon.Bug}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => push(<DebugLogsView />)}
            />
          </ActionPanel>
        }
      />
    );
  }

  const { health, channels } = state;

  // Build markdown content
  let md = "# OpenClaw Status\n\n";

  // Gateway status
  md += "## Gateway\n\n";
  if (health) {
    md += `- **Status**: ${health.ok ? "✅ Healthy" : "❌ Unhealthy"}\n`;
    if (health.version) {
      md += `- **Version**: ${health.version}\n`;
    }
    if (typeof health.uptime === "number") {
      md += `- **Uptime**: ${formatUptime(health.uptime)}\n`;
    }
  }
  md += "\n";

  // Channels status
  if (channels) {
    md += "## Channels\n\n";

    for (const channelId of channels.channelOrder) {
      const label = channels.channelLabels[channelId] || channelId;
      const accounts = channels.channelAccounts[channelId] || [];

      if (accounts.length === 0) continue;

      md += `### ${label}\n\n`;

      for (const account of accounts) {
        const icon = getChannelStatusIcon(account);
        const statusText = getChannelStatusText(account);
        const accountLabel = account.label || account.accountId;

        md += `${icon} **${accountLabel}**: ${statusText}\n`;

        if (account.lastInboundAt) {
          md += `  - Last message received: ${formatTimestamp(account.lastInboundAt)}\n`;
        }
        if (account.lastOutboundAt) {
          md += `  - Last message sent: ${formatTimestamp(account.lastOutboundAt)}\n`;
        }
      }
      md += "\n";
    }
  }

  // Connection info
  md += "---\n\n";
  md += `*Last updated: ${state.connectedAt?.toLocaleTimeString()}*\n`;

  if (deviceInfo) {
    md += `\n**Device ID**: \`${deviceInfo.deviceId.slice(0, 16)}...\`\n`;
  }

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadStatus}
          />
          <Action
            title="View Debug Logs"
            icon={Icon.Bug}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => push(<DebugLogsView />)}
          />
          <Action.CopyToClipboard
            title="Copy Device Id"
            content={deviceInfo?.deviceId || ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Reset Device Identity"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleResetDevice}
          />
        </ActionPanel>
      }
    />
  );
}

function DebugLogsView() {
  const [logs, setLogs] = useState(formatLogsAsMarkdown());

  const refresh = () => {
    setLogs(formatLogsAsMarkdown());
  };

  const handleClear = () => {
    clearLogs();
    setLogs("*Logs cleared*");
    showToast({
      style: Toast.Style.Success,
      title: "Debug Logs Cleared",
    });
  };

  const markdown = `# Debug Logs

${logs}

---
*Press Cmd+R to refresh, Cmd+K to clear*
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Logs"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refresh}
          />
          <Action
            title="Clear Logs"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            onAction={handleClear}
          />
          <Action.CopyToClipboard
            title="Copy All Logs"
            content={logs}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
