import React from 'react';
import { Action, ActionPanel, List, Toast, showToast } from '@raycast/api';
import { runCommand } from './utils/vpnService';

export default function Command() {
  const handleToggle = async (action: 'activate' | 'deactivate') => {
    try {
      await showToast(
        Toast.Style.Animated,
        `${action === 'activate' ? 'Connecting' : 'Disconnecting'} Mozilla VPN...`
      );
      await runCommand(action);
      await showToast(
        Toast.Style.Success,
        `VPN ${action === 'activate' ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await showToast(Toast.Style.Failure, 'Failed to toggle VPN', message);
    }
  };

  return (
    <List>
      <List.Item
        title="Activate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              title="Activate Vpn"
              onAction={() => handleToggle('activate')}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Deactivate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              title="Deactivate Vpn"
              onAction={() => handleToggle('deactivate')}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
