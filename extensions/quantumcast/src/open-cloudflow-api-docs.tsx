import { List, Action, ActionPanel, getPreferenceValues } from '@raycast/api';
import { cloudflow } from 'quantumlib';

export default function Command() {
  const { cloudflowBaseUrl } = getPreferenceValues();

  return (
    <List searchBarPlaceholder="Select a documentation to open in your default browser">
      {cloudflow.getApiDocumentations(cloudflowBaseUrl).map((doc) => (
        <List.Item
          id={doc.name}
          key={doc.name}
          title={doc.name}
          icon="../assets/quantumcast.png"
          accessories={[{ text: doc.location }]}
          actions={
            <ActionPanel title="Quantumcast - API Documentation">
              <Action.OpenInBrowser url={`${doc.url}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
