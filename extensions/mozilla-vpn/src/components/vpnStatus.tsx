// src/components/vpnStatus.tsx
import React from 'react';
import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';

interface VpnStatusProps {
  vpnStatus: boolean | null;
  serverCity: string;
  serverCountry: string;
  onToggleVpn: () => void;
  onSelectServer: () => void;
}

const VpnStatus: React.FC<VpnStatusProps> = ({
  vpnStatus,
  serverCity,
  serverCountry,
  onToggleVpn,
  onSelectServer,
}) => {
  // Determine appropriate icons and colors based on VPN status
  const statusIcon = vpnStatus
    ? { source: Icon.Lock, tintColor: Color.Green }
    : { source: Icon.LockUnlocked, tintColor: Color.Red };

  const title = vpnStatus ? 'Deactivate Mozilla VPN' : 'Activate Mozilla VPN';
  const actionTitle = vpnStatus ? 'Disconnect VPN' : 'Connect VPN';

  // Format server info
  const serverInfo =
    serverCity && serverCountry
      ? `${serverCity}, ${serverCountry}`
      : 'Unknown location';

  // Create a proper accessory text for the server
  const serverAccessoryText = `Configured Server: ${serverInfo}`;

  return (
    <List.Item
      title={title}
      icon={statusIcon}
      accessories={[
        { text: serverAccessoryText, icon: Icon.Globe },
        {
          text: vpnStatus ? 'Connected' : 'Disconnected',
          icon: {
            source: vpnStatus ? Icon.CheckCircle : Icon.XmarkCircle,
            tintColor: vpnStatus ? Color.Green : Color.Red,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={actionTitle}
              icon={vpnStatus ? Icon.Stop : Icon.Play}
              onAction={onToggleVpn}
            />
            <Action
              title="Change Server"
              icon={Icon.Globe}
              onAction={onSelectServer}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default VpnStatus;
