import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Divider",
    url: "https://geist-ui.dev/en-us/components/divider",
  },
  {
    title: "Snippet",
    url: "https://geist-ui.dev/en-us/components/snippet",
  },

];

export default function Command() {
  return (
    <List isLoading={false} searchBarPlaceholder="Search for components">
      {components.map((item) => (
        <List.Item
          key={item.title}
          icon={{ source: Icon.Link }}
          title={item.title}
          actions={
            <ActionPanel>
              <OpenInBrowserAction url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}