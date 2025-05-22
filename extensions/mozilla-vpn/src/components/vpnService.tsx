// src/components/vpnStatus.tsx
import React from 'react';
import { List, ActionPanel, Action, Icon, Color } from '@raycast/api';

interface VpnStatusProps {
  vpnStatus: boolean | null;
  serverCity: string;
  serverCountry: string;
  onToggleVpn: () => void | Promise<void>;
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

  const title = vpnStatus ? 'Deactivate Mozilla Vpn' : 'Activate Mozilla Vpn';
  const actionTitle = vpnStatus ? 'Disconnect VPN' : 'Connect VPN';

  // Format server info
  const serverInfo =
    serverCity && serverCountry
      ? `${serverCity}, ${serverCountry}`
      : 'Unknown location';

  return (
    <List.Item
      title={title}
      icon={statusIcon}
      accessories={[
        { text: serverInfo, icon: Icon.Globe },
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
          <Action
            title={actionTitle}
            icon={vpnStatus ? Icon.Stop : Icon.Play}
            onAction={onToggleVpn}
          />
          <Action
            title="Change Server"
            icon={Icon.Globe}
            shortcut={{ modifiers: ['cmd'], key: 's' }}
            onAction={onSelectServer}
          />
        </ActionPanel>
      }
    />
  );
};

export default VpnStatus;
