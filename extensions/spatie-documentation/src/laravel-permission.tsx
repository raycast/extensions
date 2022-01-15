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
    v2: require("./documentation/laravel-permission/v2.json"),
    v3: require("./documentation/laravel-permission/v3.json"),
    v4: require("./documentation/laravel-permission/v4.json"),
    v5: require("./documentation/laravel-permission/v5.json"),
  };

  return (
    <List>
      {Object.entries(documentation[getPreference.spatieLaravelPermissionVersion]).map(([section, items]) => (
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
