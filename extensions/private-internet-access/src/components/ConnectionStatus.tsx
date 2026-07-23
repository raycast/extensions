import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { flagAsset } from "../lib/regions";
import {
  PIA_APP_PATH,
  setAllowLan,
  setProtocol,
  setRequestPortForward,
} from "../lib/pia";
import { ConnectionState, Protocol, Region, VpnStatus } from "../types";

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
    default:
      return { title: "Not connected", color: Color.Red, icon: Icon.Shield };
  }
}

/** A numeric value means a port is actually forwarded; words are status only. */
function forwardedPort(value: string | undefined): string | undefined {
  return value && /^\d+$/.test(value) ? value : undefined;
}

function otherProtocol(current: Protocol | undefined): Protocol {
  return current === "wireguard" ? "openvpn" : "wireguard";
}

async function applySetting(
  change: () => Promise<void>,
  successMessage: string,
  onDone: () => void,
) {
  try {
    await change();
    await showToast({ style: Toast.Style.Success, title: successMessage });
    onDone();
  } catch (e) {
    await showFailureToast(e, { title: "Could not change setting" });
  }
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
  const regionName = region?.name ?? status.regionId;

  const icon =
    isConnected && region?.countryCode
      ? { source: flagAsset(region.countryCode) }
      : { source: label.icon, tintColor: label.color };

  const title = isConnected ? regionName : label.title;
  const subtitle = isConnected
    ? [
        status.protocol === "wireguard" ? "WireGuard" : status.protocol,
        region?.country,
      ]
        .filter(Boolean)
        .join("  ·  ")
    : `Selected: ${regionName}`;

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
  } else if (!isConnected && status.publicIp) {
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
  if (status.requestPortForward && !port) {
    accessories.push({
      tag: { value: "Port FW on", color: Color.SecondaryText },
      tooltip: "Port forwarding requested on next connect",
    });
  }
  if (!status.allowLan) {
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
          <Action
            title={isConnected ? "Disconnect" : "Connect"}
            icon={isConnected ? Icon.XMarkCircle : Icon.Bolt}
            onAction={onToggle}
          />
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
          {cliPath && (
            <ActionPanel.Section title="Settings">
              <Action
                title={
                  status.requestPortForward
                    ? "Disable Port Forwarding"
                    : "Enable Port Forwarding"
                }
                icon={status.requestPortForward ? Icon.LockDisabled : Icon.Lock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() =>
                  applySetting(
                    () =>
                      setRequestPortForward(
                        cliPath,
                        !status.requestPortForward,
                      ),
                    status.requestPortForward
                      ? "Port forwarding disabled"
                      : "Port forwarding enabled — applies on next connect",
                    onSettingChanged,
                  )
                }
              />
              <Action
                title={
                  status.allowLan ? "Block LAN Access" : "Allow LAN Access"
                }
                icon={status.allowLan ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                onAction={() =>
                  applySetting(
                    () => setAllowLan(cliPath, !status.allowLan),
                    status.allowLan
                      ? "LAN access blocked"
                      : "LAN access allowed",
                    onSettingChanged,
                  )
                }
              />
              <Action
                title={`Switch to ${otherProtocol(status.protocol) === "wireguard" ? "WireGuard" : "OpenVPN"}`}
                icon={Icon.Switch}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
                onAction={() =>
                  applySetting(
                    () => setProtocol(cliPath, otherProtocol(status.protocol)),
                    `Protocol set to ${otherProtocol(status.protocol) === "wireguard" ? "WireGuard" : "OpenVPN"} — reconnect to apply`,
                    onSettingChanged,
                  )
                }
              />
            </ActionPanel.Section>
          )}
          <Action
            title="Open Pia App"
            icon={Icon.AppWindow}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(appPath ?? PIA_APP_PATH)}
          />
        </ActionPanel>
      }
    />
  );
}
