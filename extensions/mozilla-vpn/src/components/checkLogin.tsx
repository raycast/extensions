// src/components/checkLogin.tsx
import React from 'react';
import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  open,
  popToRoot,
} from '@raycast/api';
import { showFailureToast } from '@raycast/utils';

interface CheckLoginProps {
  onBack?: () => void; // Add optional onBack prop
}

const openMozillaVPNApp = async () => {
  try {
    await open('/Applications/Mozilla VPN.app');
    await popToRoot();
    await closeMainWindow();
  } catch (error) {
    console.error('Error opening Mozilla VPN:', error);
    await showFailureToast(error, { title: 'Failed to open Mozilla VPN' });
  }
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
