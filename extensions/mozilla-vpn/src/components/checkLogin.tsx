// src/components/checkLogin.tsx
import React from 'react';
import * as Raycast from '@raycast/api';
import { exec } from 'child_process';

// Extract simple components
const popToRoot = Raycast.popToRoot;
const closeMainWindow = Raycast.closeMainWindow;
const Icon = Raycast.Icon;

// Define proper types for List to avoid 'any' usage and interface extension issues
interface ListProps {
  isLoading?: boolean;
  navigationTitle?: string;
  children?: React.ReactNode;
}

interface ListComponent {
  (props: ListProps): React.ReactElement | null;
  Item: React.ComponentType<Record<string, unknown>>;
  Section: React.ComponentType<Record<string, unknown>>;
  EmptyView: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for ActionPanel
interface ActionPanelProps {
  children?: React.ReactNode;
}

interface ActionPanelComponent {
  (props: ActionPanelProps): React.ReactElement | null;
  Section: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for Action
interface ActionProps {
  title: string;
  icon?: unknown;
  onAction?: () => void;
  shortcut?: unknown;
}

interface ActionComponent {
  (props: ActionProps): React.ReactElement | null;
  OpenInBrowser: React.ComponentType<Record<string, unknown>>;
  Push: React.ComponentType<Record<string, unknown>>;
  Pop: React.ComponentType<Record<string, unknown>>;
  Copy: React.ComponentType<Record<string, unknown>>;
  Paste: React.ComponentType<Record<string, unknown>>;
  ShowInFinder: React.ComponentType<Record<string, unknown>>;
  Open: React.ComponentType<Record<string, unknown>>;
  OpenWith: React.ComponentType<Record<string, unknown>>;
  SubmitForm: React.ComponentType<Record<string, unknown>>;
  Trash: React.ComponentType<Record<string, unknown>>;
}

// Type assertions to bypass the complex intersection type issues
const List = (Raycast as unknown as { List: ListComponent }).List;
const ActionPanel = (
  Raycast as unknown as { ActionPanel: ActionPanelComponent }
).ActionPanel;
const Action = (Raycast as unknown as { Action: ActionComponent }).Action;

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
