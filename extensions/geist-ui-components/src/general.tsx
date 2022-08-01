import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Text",
    url: "https://geist-ui.dev/en-us/components/text",
  },
  {
    title: "Button",
    url: "https://geist-ui.dev/en-us/components/button",
  },
  {
    title: "Code",
    url: "https://geist-ui.dev/en-us/components/code",
  },
  {
    title: "Icons",
    url: "https://geist-ui.dev/en-us/components/icons",
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
