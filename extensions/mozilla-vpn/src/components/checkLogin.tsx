// src/components/checkLogin.tsx
import React from 'react';
import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  popToRoot,
} from '@raycast/api';
import { exec } from 'child_process';

interface CheckLoginProps {
  onBack?: () => void; // Add optional onBack prop
}

const openMozillaVPNApp = () => {
  exec('open -a "Mozilla VPN"', (error) => {
    if (error) {
      console.error('Error opening Mozilla VPN:', error);
    } else {
      popToRoot();
      closeMainWindow();
    }
  });
};

const CheckLogin: React.FC<CheckLoginProps> = ({ onBack }) => {
  return (
    <List.EmptyView
      title="Mozilla VPN Login Required"
      description="Please log in using the Mozilla VPN application. Press Enter to open the app."
      icon={Icon.ExclamationMark}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action title="Open Mozilla VPN" onAction={openMozillaVPNApp} />
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
