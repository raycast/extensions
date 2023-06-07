import { List, Action, ActionPanel, getPreferenceValues, open, Icon } from '@raycast/api';
import { useState, useEffect } from 'react';
import { cloudflow } from 'quantumlib';

interface Session {
  session: string;
  expiry_time: string;
}

interface Whitepaper {
  name: string;
  system: boolean;
}

export default function Command() {
  const { cloudflowBaseUrl, cloudflowUserName, cloudflowUserPassword, cloudflowListSystemWhitepapers } =
    getPreferenceValues();
  const [cloudflowWhitepapers, setCloudflowWhitepapers] = useState<Whitepaper[]>([]);

  useEffect(() => {
    const fetchCloudflowWhitepapers = async () => {
      const session: Session | undefined = await cloudflow.getSession(
        cloudflowBaseUrl,
        cloudflowUserName,
        cloudflowUserPassword
      );
      const data = await cloudflow.getWhitepapers(
        cloudflowBaseUrl,
        session?.session ?? '',
        cloudflowListSystemWhitepapers
      );
      setCloudflowWhitepapers(data ?? []);
    };
    fetchCloudflowWhitepapers();
  }, []);

  return (
    <List
      isLoading={cloudflowWhitepapers.length === 0}
      searchBarPlaceholder="Select a Cloudflow whitepaper to open in your default browser"
    >
      {cloudflowWhitepapers.map((whitepaper: Whitepaper) => (
        <List.Item
          id={`${whitepaper.name}-${cloudflowWhitepapers.indexOf(whitepaper)}`}
          key={`${whitepaper.name}-${cloudflowWhitepapers.indexOf(whitepaper)}`}
          title={whitepaper.name}
          icon="../assets/quantumcast.png"
          accessories={[
            {
              icon: whitepaper.system ? Icon.Gear : Icon.Person,
              tooltip: whitepaper.system ? 'System Whitepaper' : 'Custom Whitepaper',
            },
          ]}
          actions={
            <ActionPanel title="Quantumcast - Open Cloudflow Whitepaper">
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={() => open(cloudflow.getWhitepaperURL(cloudflowBaseUrl, whitepaper.name) ?? '')}
              />
              <Action.CopyToClipboard
                title="Copy URL to Clipboard"
                icon={Icon.Clipboard}
                content={cloudflow.getWhitepaperURL(cloudflowBaseUrl, whitepaper.name) ?? ''}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
