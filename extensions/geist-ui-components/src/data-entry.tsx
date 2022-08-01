import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";

const components = [
  {
    title: "Auto-Complete",
    url: "https://geist-ui.dev/en-us/components/auto-complete",
  },
  {
    title: "Button Group",
    url: "https://geist-ui.dev/en-us/components/button-group",
  },
  {
    title: "Checkbox",
    url: "https://geist-ui.dev/en-us/components/checkbox",
  },
  {
    title: "Input",
    url: "https://geist-ui.dev/en-us/components/input",
  },
  {
    title: "Radio",
    url: "https://geist-ui.dev/en-us/components/radio",
  },
  {
    title: "Select",
    url: "https://geist-ui.dev/en-us/components/select",
  },
  {
    title: "Slider",
    url: "https://geist-ui.dev/en-us/components/slider",
  },
  {
    title: "Textarea",
    url: "https://geist-ui.dev/en-us/components/textarea",
  },
  {
    title: "Toggle",
    url: "https://geist-ui.dev/en-us/components/toggle",
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
