import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Card",
    url: "https://geist-ui.dev/en-us/components/card",
  },
  {
    title: "Collapse",
    url: "https://geist-ui.dev/en-us/components/collapse",
  },
  {
    title: "Fieldset",
    url: "https://geist-ui.dev/en-us/components/fieldset",
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