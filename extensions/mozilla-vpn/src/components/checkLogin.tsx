// src/components/checkLogin.tsx
import React from 'react';
import {
  List,
  ActionPanel,
  Action,
  popToRoot,
  closeMainWindow,
  Icon,
} from '@raycast/api';
import { exec } from 'child_process';

interface CheckLoginProps {
  onBack?: () => void; // Add optional onBack prop
}

const openMozillaVpnApp = () => {
  exec('open -a "Mozilla Vpn"', (error) => {
    if (error) {
      console.error('Error opening Mozilla Vpn:', error);
    } else {
      popToRoot();
      closeMainWindow();
    }
  });
};

const CheckLogin: React.FC<CheckLoginProps> = ({ onBack }) => {
  return (
    <List.EmptyView
      title="Mozilla Vpn Login Required"
      description="Please log in using the Mozilla Vpn application. Press Enter to open the app."
      icon="Icon.ExclamationMark"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open Mozilla Vpn" onAction={openMozillaVpnApp} />
          </ActionPanel.Section>

          {/* Add Back to Main Menu action if onBack is provided */}
          {onBack && (
            <ActionPanel.Section>
              <Action
                title="Back to Main Menu"
                icon={Icon.ArrowLeft}
                onAction={onBack}
                shortcut={{ modifiers: ['cmd'], key: 'b' }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
};

export default CheckLogin;
