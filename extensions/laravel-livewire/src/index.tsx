import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  CopyToClipboardAction,
  getPreferenceValues,
  showToast, ToastStyle
} from "@raycast/api";

export default function SearchDocumentation() {

  const getPreference = getPreferenceValues();
  const documentation = {
    "1.x": require("./documentation/1.x.json"),
    "2.x": require("./documentation/2.x.json")
  }
  
  return (
    <List>
      {Object.entries(documentation[getPreference.livewireVersion]).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              icon="livewire-icon-transparent.png"
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
