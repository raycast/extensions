import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Avatar",
    url: "https://geist-ui.dev/en-us/components/avatar",
  },
  {
    title: "Badge",
    url: "https://geist-ui.dev/en-us/components/badge",
  },
  {
    title: "Capacity",
    url: "https://geist-ui.dev/en-us/components/capacity",
  },
  {
    title: "Description",
    url: "https://geist-ui.dev/en-us/components/description",
  },
  {
    title: "Display",
    url: "https://geist-ui.dev/en-us/components/display",
  },
  {
    title: "Dot",
    url: "https://geist-ui.dev/en-us/components/dot",
  },
  {
    title: "File Tree",
    url: "https://geist-ui.dev/en-us/components/file-tree",
  },
  {
    title: "Image",
    url: "https://geist-ui.dev/en-us/components/image",
  },
  {
    title: "Keyboard",
    url: "https://geist-ui.dev/en-us/components/keyboard",
  },
  {
    title: "Popover",
    url: "https://geist-ui.dev/en-us/components/popover",
  },
  {
    title: "Table",
    url: "https://geist-ui.dev/en-us/components/table",
  },
  {
    title: "Tag",
    url: "https://geist-ui.dev/en-us/components/tag",
  },
  {
    title: "Tooltip",
    url: "https://geist-ui.dev/en-us/components/tooltip",
  },
  {
    title: "User",
    url: "https://geist-ui.dev/en-us/components/user",
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
