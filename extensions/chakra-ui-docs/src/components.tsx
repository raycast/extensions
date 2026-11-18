import { ActionPanel, List, Action } from "@raycast/api";
import Components from "./documentation/componentsDocs";
import VersionSelector from "./version-selector";
import { useCachedState } from "@raycast/utils";

export default function SearchDocumentation() {
  const [version] = useCachedState("version");

  return (
    <List searchBarAccessory={<VersionSelector />}>
      {Object.entries(version === "v2" ? Components.v2 : Components.v3).map(([section, items]) => (
        <List.Section title={section} key={section}>
          {items.map((item) => (
            <List.Item
              key={item.url}
              title={item.title}
              icon="chakra-ui.png"
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
