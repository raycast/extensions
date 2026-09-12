import { ActionPanel, List, Action } from '@raycast/api';
import documentation from './documentation';

export default function SearchApiDocumentation() {
  return (
    <List>
      {Object.entries(documentation).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="specify-icon.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
