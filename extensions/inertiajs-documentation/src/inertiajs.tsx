import { ActionPanel, CopyToClipboardAction, getPreferenceValues, List, OpenInBrowserAction } from "@raycast/api";

export default function SearchDocumentation() {
  const getPreference = getPreferenceValues();

  type docList = {
    [versions: string]: {
      title: string;
      url: string;
    }[];
  };

  const documentation: { [key: string]: docList } = {
    "v1.x": require("./documentation/v1.x.json"),
  };

  return (
    <List>
      {Object.entries(documentation[getPreference.inertiajsVersion]).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="inertiajs-icon.png"
              title={item.title}
              keywords={[item.title, section]}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction url={item.url} />
                  <CopyToClipboardAction title="Copy URL" content={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
