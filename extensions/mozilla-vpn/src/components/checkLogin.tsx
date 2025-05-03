import React from 'react';
import {
  List,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
} from '@raycast/api';
import { exec } from 'child_process';

const openMozillaVpnApp = () => {
  exec('open -a "Mozilla VPN"', (error) => {
    if (error) {
      console.error('Error opening Mozilla VPN:', error);
    } else {
      popToRoot();
      closeMainWindow();
    }
  });
};

const CheckLogin: React.FC = () => {
  return (
    <List.EmptyView
      title="Mozilla VPN Login Required"
      description="Please log in using the Mozilla VPN application. Press Enter to open the app."
      icon="⚠️"
      actions={
        <ActionPanel>
          <Action title="Open Mozilla VPN" onAction={openMozillaVpnApp} />
        </ActionPanel>
      }
    />
  );
};

export default CheckLogin;
