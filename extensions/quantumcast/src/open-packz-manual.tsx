import { List, Action, ActionPanel, getPreferenceValues, open, Icon } from '@raycast/api';
import { useState, useEffect } from 'react';
import { packz, env } from 'quantumlib';

interface PackzInstallation {
  folder: string;
  url: string;
  executable: string;
}

export default function Command() {
  const { packzManualLanguage } = getPreferenceValues();
  const [packzInstallations, setPackzInstallations] = useState<PackzInstallation[]>([]);

  useEffect(() => {
    const fetchPackInstallations = async () => {
      const data = await packz.listInstallations(env.applicationsFolder);
      setPackzInstallations(data);
    };
    fetchPackInstallations();
  }, []);

  return (
    <List searchBarPlaceholder="Select a Packz manual release to open in your default browser">
      {packzInstallations.map((installation: PackzInstallation) => (
        <List.Item
          id={installation.folder}
          key={installation.folder}
          title={installation.folder}
          icon="../assets/quantumcast.png"
          accessories={[{ text: installation.executable }]}
          actions={
            <ActionPanel title="Quantumcast - Open Packz Manual">
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                onAction={async () =>
                  open(packz.getManualURL(`${installation.url}/${installation.executable}`, packzManualLanguage) ?? '')
                }
              />
              <Action.Open title="Reveal in Finder" target={installation.url} />
              <Action.CopyToClipboard
                title="Copy URL to Clipboard"
                content={
                  packz.getManualURL(`${installation.url}/${installation.executable}`, packzManualLanguage) ?? ''
                }
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
