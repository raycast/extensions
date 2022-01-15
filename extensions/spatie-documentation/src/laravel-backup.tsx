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
    v3: require("./documentation/laravel-backup/v3.json"),
    v4: require("./documentation/laravel-backup/v4.json"),
    v5: require("./documentation/laravel-backup/v5.json"),
    v6: require("./documentation/laravel-backup/v6.json"),
    v7: require("./documentation/laravel-backup/v7.json"),
    v8: require("./documentation/laravel-backup/v8.json"),
  };

  return (
    <List>
      {Object.entries(documentation[getPreference.spatieLaravelBackupVersion]).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="spatie-icon.png"
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
