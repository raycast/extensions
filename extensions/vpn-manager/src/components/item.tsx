import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { VPNConnection } from "../scutil";
import { useState, useEffect } from "react";
import { connect, disconnect } from "../scutil";

interface VPNProps {
  vpn: VPNConnection;
  onAction: () => void;
}

export default function VPN(props: VPNProps): JSX.Element {
  const title = props.vpn.name ? props.vpn.name : "Empty";

  const [connected, setConnected] = useState(props.vpn.connected);

  const tintColor = connected ? Color.Green : Color.Red;
  const tooltip = connected ? "Connected" : "Disconnected";
  const icon = { source: connected ? Icon.CheckCircle : Icon.Circle, tintColor };

  const dev = props.vpn.dev;

  useEffect(() => {
    setConnected(props.vpn.connected);
  }, [props.vpn.connected]);

  const handleMainClick = async () => {
    await LocalStorage.setItem("last-used", props.vpn.name);
    if (props.vpn.connected) {
      handleDisconnectClick();
    } else {
      handleConnectClick();
    }
  };

  const handleConnectClick = async () => {
    await connect(props.vpn);
    props.onAction();
  };

  const handleDisconnectClick = async () => {
    await disconnect(props.vpn);
    props.onAction();
  };

  return (
    <List.Item
      subtitle={dev}
      key={title}
      title={title}
      icon={tooltip ? { value: icon, tooltip } : icon}
      actions={
        <ActionPanel title="VPN Actions">
          <Action title="Connect VPN" onAction={() => handleMainClick()} />
          <Action title="Stop VPN" onAction={() => handleDisconnectClick()} />
        </ActionPanel>
      }
    />
  );
}
