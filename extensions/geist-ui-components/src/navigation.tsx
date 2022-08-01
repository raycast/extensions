import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Breadcrumbs",
    url: "https://geist-ui.dev/en-us/components/breadcrumbs",
  },
  {
    title: "Link",
    url: "https://geist-ui.dev/en-us/components/link",
  },
  {
    title: "Pagination",
    url: "https://geist-ui.dev/en-us/components/pagination",
  },
  {
    title: "Tabs",
    url: "https://geist-ui.dev/en-us/components/tabs",
  },
  {
    title: "Button Dropdown",
    url: "https://geist-ui.dev/en-us/components/button-dropdown",
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
