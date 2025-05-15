// src/components/serverDetails.tsx
import React from 'react';
import { Detail, ActionPanel, Action, Icon, Color } from '@raycast/api';

interface ServerDetailsProps {
  serverCity: string;
  serverCountry: string;
  ipAddress: string;
  isConnected: boolean;
  onToggleVpn: () => void;
  onSelectServer: () => void;
  onBack?: () => void; // Add optional onBack prop
}

const ServerDetails: React.FC<ServerDetailsProps> = ({
  serverCity,
  serverCountry,
  ipAddress,
  isConnected,
  onToggleVpn,
  onSelectServer,
  onBack
}) => {
  const statusText = isConnected ? 'Connected' : 'Disconnected';
  const actionTitle = isConnected ? 'Disconnect VPN' : 'Connect VPN';
  const actionIcon = isConnected ? Icon.Stop : Icon.Play;
  
  // Using emoji for color instead of HTML spans
  const statusEmoji = isConnected ? '🟢' : '🔴';
  
  const markdown = `
  # Mozilla VPN Status

  ## Connection Information
  - **Status**: ${statusEmoji} ${statusText}
  - **Server Location**: ${serverCity}, ${serverCountry}
  - **IP Address**: ${ipAddress}

  ## Connection Details
  ${isConnected ? `
  Your connection to Mozilla VPN is currently active. All your internet traffic is being routed through the VPN server in ${serverCity}, ${serverCountry}.
  
  Your real IP address is hidden, and websites see your VPN IP address (${ipAddress}).
  ` : `
  Your connection to Mozilla VPN is currently inactive. Your internet traffic is not being protected by the VPN.
  
  Your current IP address (${ipAddress}) is visible to websites you visit.
  `}

  ## Mozilla VPN Features
  - **Privacy**: Encrypts your internet connection
  - **Security**: Protects your data on public WiFi
  - **No-logs Policy**: Mozilla doesn't track your network activity
  - **Global Access**: Connect to servers in multiple countries
  `;

  return (
    <Detail
      navigationTitle="VPN Server Details"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={statusText}
            icon={{ source: isConnected ? Icon.CheckCircle : Icon.XmarkCircle, tintColor: isConnected ? Color.Green : Color.Red }}
          />
          <Detail.Metadata.Label
            title="Server Location"
            text={`${serverCity}, ${serverCountry}`}
            icon={Icon.Globe}
          />
          <Detail.Metadata.Label
            title="IP Address"
            text={ipAddress}
            icon={Icon.Network}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Connection"
            text={isConnected ? "Encrypted" : "Not Encrypted"}
            icon={isConnected ? Icon.Lock : Icon.LockUnlocked}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={actionTitle}
              icon={actionIcon}
              onAction={onToggleVpn}
            />
            <Action
              title="Change Server"
              icon={Icon.Globe}
              onAction={onSelectServer}
            />
          </ActionPanel.Section>
          
          {/* Add Back to Main Menu action if onBack is provided */}
          {onBack && (
            <ActionPanel.Section>
              <Action 
                title="Back to Main Menu" 
                icon={Icon.ArrowLeft}
                onAction={onBack} 
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
};

export default ServerDetails;