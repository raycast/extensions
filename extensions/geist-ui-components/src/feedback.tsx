import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Drawer",
    url: "https://geist-ui.dev/en-us/components/drawer",
  },
  {
    title: "Loading",
    url: "https://geist-ui.dev/en-us/components/loading",
  },
  {
    title: "Modal",
    url: "https://geist-ui.dev/en-us/components/modal",
  },
  {
    title: "Note",
    url: "https://geist-ui.dev/en-us/components/note",
  },
  {
    title: "Progress",
    url: "https://geist-ui.dev/en-us/components/progress",
  },
  {
    title: "Rating",
    url: "https://geist-ui.dev/en-us/components/rating",
  },
  {
    title: "Spinner",
    url: "hhttps://geist-ui.dev/en-us/components/spinner",
  },
  {
    title: "Toast",
    url: "https://geist-ui.dev/en-us/components/toast",
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