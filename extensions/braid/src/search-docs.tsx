import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const url = "https://braid-raycast-extension.s3.ap-southeast-2.amazonaws.com/componentMap.json";

export default function Command() {
  const { data: componentData } = useFetch<Record<string, string>>(url);

  if (!componentData) {
    return <List isLoading />;
  }

  const componentMapEntries = Object.entries(componentData);

  return (
    <List filtering={{ keepSectionOrder: true }}>
      {componentMapEntries.map(([section, items]) => (
        <List.Section title={section} key={section} subtitle={`${Object.entries(items).length} Pages`}>
          {Object.entries(items).map(([name, url]) => (
            <List.Item
              key={name}
              title={name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
