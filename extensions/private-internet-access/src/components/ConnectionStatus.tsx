import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { flagAsset } from "../lib/regions";
import { ConnectionState, Region, VpnStatus } from "../types";
import { SettingsActions } from "./SettingsActions";

interface Props {
  status: VpnStatus;
  region?: Region;
  appPath?: string;
  cliPath?: string;
  onToggle: () => void;
  onSettingChanged: () => void;
}

function stateLabel(state: ConnectionState): {
  title: string;
  color: Color;
  icon: Icon;
} {
  switch (state) {
    case "Connected":
      return {
        title: "Connected & secure",
        color: Color.Green,
        icon: Icon.CheckCircle,
      };
    case "Connecting":
    case "Reconnecting":
    case "DisconnectingToReconnect":
      return {
        title: "Connecting…",
        color: Color.Yellow,
        icon: Icon.Hourglass,
      };
    case "Disconnecting":
      return {
        title: "Disconnecting…",
        color: Color.Yellow,
        icon: Icon.Hourglass,
      };
    case "Interrupted":
      return {
        title: "Connection interrupted",
        color: Color.Orange,
        icon: Icon.ExclamationMark,
      };
    case "Unknown":
      return {
        title: "Status unavailable",
        color: Color.SecondaryText,
        icon: Icon.QuestionMark,
      };
    default:
      return { title: "Not connected", color: Color.Red, icon: Icon.Shield };
  }
}

/** A numeric value means a port is actually forwarded; words are status only. */
function forwardedPort(value: string | undefined): string | undefined {
  return value && /^\d+$/.test(value) ? value : undefined;
}

export function ConnectionStatus({
  status,
  region,
  appPath,
  cliPath,
  onToggle,
  onSettingChanged,
}: Props) {
  const label = stateLabel(status.state);
  const isConnected = status.state === "Connected";
  const isUnknown = status.state === "Unknown";
  const regionName = region?.name ?? status.regionId;

  const icon =
    isConnected && region?.countryCode
      ? { source: flagAsset(region.countryCode) }
      : { source: label.icon, tintColor: label.color };

  const title = isConnected ? (regionName ?? "Connected") : label.title;
  const subtitle = isConnected
    ? [
        status.protocol === "wireguard" ? "WireGuard" : status.protocol,
        region?.country,
      ]
        .filter(Boolean)
        .join("  ·  ")
    : regionName
      ? `Selected: ${regionName}`
      : "";

  // piactl's `pubip` is the ISP-assigned address and does NOT change while the
  // tunnel is up, so surfacing it as the connected IP would show the user's
  // real home address. `vpnip` is the tunnel address — the safe one to show.
  const accessories: List.Item.Accessory[] = [];
  if (isConnected && status.vpnIp) {
    accessories.push({
      icon: Icon.Globe,
      text: status.vpnIp,
      tooltip: "VPN IP",
    });
  } else if (!isConnected && !isUnknown && status.publicIp) {
    accessories.push({
      icon: { source: Icon.Eye, tintColor: Color.Orange },
      text: status.publicIp,
      tooltip: "Your unprotected public IP",
    });
  }

  const port = forwardedPort(status.portForward);
  if (port) {
    accessories.push({
      tag: { value: `Port ${port}`, color: Color.Blue },
      tooltip: "Forwarded port",
    });
  }
  if (status.requestPortForward === true && !port) {
    accessories.push({
      tag: { value: "Port FW on", color: Color.SecondaryText },
      tooltip: "Port forwarding requested on next connect",
    });
  }
  // Only claim LAN is blocked when that was actually read as false — an
  // unreadable setting must not be reported as a restriction that isn't there.
  if (status.allowLan === false) {
    accessories.push({
      tag: { value: "LAN blocked", color: Color.Orange },
      tooltip: "Local network access is blocked while connected",
    });
  }
  if (!isConnected) {
    accessories.push({ tag: { value: label.title, color: label.color } });
  }

  return (
    <List.Item
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          {/* Hidden when the state is unreadable: the label would have to
              guess a direction, and acting on that guess is what turns a
              disconnect request into a connection. */}
          {!isUnknown && (
            <Action
              title={isConnected ? "Disconnect" : "Connect"}
              icon={isConnected ? Icon.XMarkCircle : Icon.Bolt}
              onAction={onToggle}
            />
          )}
          {isConnected && status.vpnIp && (
            <Action.CopyToClipboard
              title="Copy VPN IP"
              content={status.vpnIp}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          {port && (
            <Action.CopyToClipboard
              title="Copy Forwarded Port"
              content={port}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          )}
          <SettingsActions
            status={status}
            cliPath={cliPath}
            appPath={appPath}
            onSettingChanged={onSettingChanged}
          />
        </ActionPanel>
      }
    />
  );
}
