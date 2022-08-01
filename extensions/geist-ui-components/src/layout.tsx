import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Grid",
    url: "https://geist-ui.dev/en-us/components/grid",
  },
  {
    title: "Page",
    url: "https://geist-ui.dev/en-us/components/page",
  },
  {
    title: "Spacer",
    url: "https://geist-ui.dev/en-us/components/spacer",
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
