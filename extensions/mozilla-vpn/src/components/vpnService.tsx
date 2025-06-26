// src/components/vpnStatus.tsx
import React from 'react';
import * as Raycast from '@raycast/api';

// Extract simple components
const Icon = Raycast.Icon;
const Color = Raycast.Color;

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

  const title = vpnStatus ? 'Deactivate Mozilla VPN' : 'Activate Mozilla VPN';
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
