import React from 'react';
import { List, ActionPanel, Action } from '@raycast/api';

interface VpnStatusProps {
  vpnStatus: boolean | null;
  serverCity: string;
  onToggleVpn: () => void;
}

const VpnStatus: React.FC<VpnStatusProps> = ({
  vpnStatus,
  serverCity,
  onToggleVpn,
}) => {
  return (
    <List.Item
      title={vpnStatus ? 'Deactivate Mozilla VPN' : 'Activate Mozilla VPN'}
      accessories={[
        { text: `Server City: ${serverCity}` },
        { text: `Status: ${vpnStatus ? 'Connected' : 'Disconnected'}` },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={vpnStatus ? 'Deactivate VPN' : 'Activate VPN'}
            onAction={onToggleVpn}
          />
        </ActionPanel>
      }
    />
  );
};

export default VpnStatus;
