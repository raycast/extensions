import { List, Action, ActionPanel, getPreferenceValues, open, Icon } from '@raycast/api';
import { useState, useEffect } from 'react';
import { cloudflow } from 'quantumlib';

interface Session {
  session: string;
  expiry_time: string;
}

export default function Command() {
  const { cloudflowBaseUrl, cloudflowUserName, cloudflowUserPassword } = getPreferenceValues();
  const [cloudflowCollections, setCloudflowCollections] = useState<string[]>([]);

  useEffect(() => {
    const fetchCloudflowCollections = async () => {
      const session: Session | undefined = await cloudflow.getSession(
        cloudflowBaseUrl,
        cloudflowUserName,
        cloudflowUserPassword
      );
      const data = await cloudflow.getCollections(cloudflowBaseUrl, session?.session ?? '');
      setCloudflowCollections(data ?? []);
    };
    fetchCloudflowCollections();
  }, []);

  return (
    <List
      isLoading={cloudflowCollections.length === 0}
      searchBarPlaceholder="Select a Cloudflow collection to open in your default browser"
    >
      {cloudflowCollections.map((collection: string) => (
        <List.Item
          id={collection}
          key={collection}
          title={collection}
          icon="../assets/quantumcast.png"
          accessories={[
            {
              icon: collection.includes('customobjects.') ? Icon.Person : Icon.Gear,
              tooltip: collection.includes('customobjects.') ? 'Custom Collection' : 'System Collection',
            },
          ]}
          actions={
            <ActionPanel title="Quantumcast - Open Cloudflow Collection">
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={() => open(cloudflow.getCollectionURL(cloudflowBaseUrl, collection) ?? '')}
              />
              <Action.CopyToClipboard
                title="Copy URL to Clipboard"
                icon={Icon.Clipboard}
                content={cloudflow.getCollectionURL(cloudflowBaseUrl, collection) ?? ''}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
