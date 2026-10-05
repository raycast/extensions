import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkGatewayConnection, getPreferences } from "./api";
import {
  authenticateCloudflareAccess,
  findCloudflared,
} from "./openclaw/cloudflare-access";
import {
  CLOUDFLARE_AUTH_MODE_LABELS,
  CONNECTION_MODE_LABELS,
} from "./openclaw/config";
import type { GatewayConnection } from "./openclaw/gateway";

type GatewayStatus =
  | { state: "connected"; connection: GatewayConnection }
  | {
      state: "error";
      gatewayUrl: string;
      webUrl: string;
      error: string;
      cloudflareBrowserAuth: boolean;
      cloudflaredInstalled: boolean;
      pairingCommand?: string;
    };

function markdownForStatus(status: GatewayStatus): string {
  if (status.state === "error") {
    const safeError = status.error
      .replace(/\|/g, "\\|")
      .replace(/`/g, "'")
      .replace(/\s+/g, " ");
    return `# Gateway unavailable

| Property | Value |
| --- | --- |
| Gateway | \`${status.gatewayUrl}\` |
| Error | ${safeError} |

## Recovery

- Pairing request: run the displayed \`openclaw devices approve …\` command on the Gateway host, then refresh.
- Local connection: verify OpenClaw with \`openclaw gateway status\`.
- Remote connection: use a trusted \`wss://\` endpoint from Tailscale Serve or Cloudflare Tunnel.
- Cloudflare Access: sign in through the provider configured by the Access policy, or use a service token for unattended access.
`;
  }

  const connection = status.connection;
  const cloudflareAccess =
    connection.connectionMode === "cloudflare"
      ? `| Cloudflare Access | ${CLOUDFLARE_AUTH_MODE_LABELS[connection.cloudflareAuthMode]} |\n`
      : "";
  return `# Gateway connected

| Property | Value |
| --- | --- |
| Connection | ${CONNECTION_MODE_LABELS[connection.connectionMode]} |
${cloudflareAccess}| Gateway | \`${connection.gatewayUrl}\` |
| Agent | \`${connection.agentId}\` |
| OpenClaw | \`${connection.serverVersion}\` |
| Protocol | \`${connection.protocol}\` |
| Handshake | ${connection.latencyMs} ms |
| Presence entries | ${connection.presenceCount} |
| Health snapshot | ${connection.healthOk ? "Healthy" : "No explicit health flag"} |
| Available methods | ${connection.methods.length} |

Raycast uses a paired device identity and the native OpenClaw Gateway protocol.
`;
}

export default function Command() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const startedInitialRefresh = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const connection = await checkGatewayConnection();
      setStatus({ state: "connected", connection });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OpenClaw did not respond.";
      const pairingRequest = message.match(
        /openclaw devices approve ([a-zA-Z0-9-]+)/,
      );
      let gatewayUrl = "Not resolved";
      let webUrl = "";
      let cloudflareBrowserAuth = false;
      try {
        const preferences = getPreferences();
        gatewayUrl = preferences.gatewayUrl;
        webUrl = preferences.webUrl;
        cloudflareBrowserAuth =
          preferences.connectionMode === "cloudflare" &&
          preferences.cloudflareAuthMode === "browser";
      } catch {
        // The original validation error already tells the user what to fix.
      }
      setStatus({
        state: "error",
        gatewayUrl,
        webUrl,
        error: message,
        cloudflareBrowserAuth,
        cloudflaredInstalled: findCloudflared() !== undefined,
        pairingCommand: pairingRequest?.[0],
      });
      await showToast({
        style: Toast.Style.Failure,
        title: "Gateway Unavailable",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInToCloudflare = useCallback(async () => {
    const preferences = getPreferences();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Cloudflare Access",
      message: "Complete sign-in with the provider shown in your browser.",
    });
    try {
      await authenticateCloudflareAccess(preferences.webUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Cloudflare Access Authenticated";
      toast.message = "Connecting to OpenClaw…";
      await refresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Cloudflare Sign-In Failed";
      toast.message =
        error instanceof Error ? error.message : "Authentication failed.";
    }
  }, [refresh]);

  useEffect(() => {
    if (startedInitialRefresh.current) return;
    startedInitialRefresh.current = true;
    void refresh();
  }, [refresh]);

  const gatewayUrl =
    status?.state === "connected"
      ? status.connection.gatewayUrl
      : status?.gatewayUrl;
  const webUrl =
    status?.state === "connected" ? status.connection.webUrl : status?.webUrl;

  return (
    <Detail
      isLoading={isLoading}
      markdown={status ? markdownForStatus(status) : "Connecting…"}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          {gatewayUrl ? (
            <Action.CopyToClipboard
              title="Copy Gateway URL"
              content={gatewayUrl}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : null}
          {webUrl ? (
            <Action.OpenInBrowser
              title="Open OpenClaw Control UI"
              url={webUrl}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          ) : null}
          {status?.state === "error" && status.pairingCommand ? (
            <Action.CopyToClipboard
              title="Copy Device Approval Command"
              icon={Icon.CopyClipboard}
              content={status.pairingCommand}
            />
          ) : null}
          {status?.state === "error" &&
          status.cloudflareBrowserAuth &&
          !status.pairingCommand &&
          status.cloudflaredInstalled ? (
            <Action
              title="Sign in to Cloudflare Access"
              icon={Icon.Person}
              onAction={signInToCloudflare}
            />
          ) : null}
          {status?.state === "error" &&
          status.cloudflareBrowserAuth &&
          !status.pairingCommand &&
          !status.cloudflaredInstalled ? (
            <Action.OpenInBrowser
              title="Install Cloudflared"
              icon={Icon.Download}
              url="https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/"
            />
          ) : null}
          {status?.state === "error" ? (
            <Action
              title="Open Connection Settings"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
