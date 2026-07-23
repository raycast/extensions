import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  PIA_APP_PATH,
  setAllowLan,
  setProtocol,
  setRequestPortForward,
} from "../lib/pia";
import { Protocol, VpnStatus } from "../types";

interface Props {
  status: VpnStatus;
  cliPath?: string;
  appPath?: string;
  onSettingChanged: () => void;
}

function otherProtocol(current: Protocol | undefined): Protocol {
  return current === "wireguard" ? "openvpn" : "wireguard";
}

function protocolLabel(protocol: Protocol): string {
  return protocol === "wireguard" ? "WireGuard" : "OpenVPN";
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

/**
 * PIA settings, shown on every row rather than only the status row so they're
 * reachable wherever the selection happens to be.
 *
 * Each action is rendered only when its current value was actually read —
 * toggling against an unknown value would set the opposite of what the label
 * promises.
 */
export function SettingsActions({
  status,
  cliPath,
  appPath,
  onSettingChanged,
}: Props) {
  return (
    <ActionPanel.Section title="Settings">
      {cliPath && status.requestPortForward !== undefined && (
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
              () => setRequestPortForward(cliPath, !status.requestPortForward),
              status.requestPortForward
                ? "Port forwarding disabled"
                : "Port forwarding enabled — applies on next connect",
              onSettingChanged,
            )
          }
        />
      )}
      {cliPath && status.allowLan !== undefined && (
        <Action
          title={status.allowLan ? "Block LAN Access" : "Allow LAN Access"}
          icon={status.allowLan ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={() =>
            applySetting(
              () => setAllowLan(cliPath, !status.allowLan),
              status.allowLan ? "LAN access blocked" : "LAN access allowed",
              onSettingChanged,
            )
          }
        />
      )}
      {cliPath && status.protocol !== undefined && (
        <Action
          title={`Switch to ${protocolLabel(otherProtocol(status.protocol))}`}
          icon={Icon.Switch}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={() =>
            applySetting(
              () => setProtocol(cliPath, otherProtocol(status.protocol)),
              `Protocol set to ${protocolLabel(otherProtocol(status.protocol))} — reconnect to apply`,
              onSettingChanged,
            )
          }
        />
      )}
      <Action
        title="Open Pia App"
        icon={Icon.AppWindow}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => open(appPath ?? PIA_APP_PATH)}
      />
    </ActionPanel.Section>
  );
}
