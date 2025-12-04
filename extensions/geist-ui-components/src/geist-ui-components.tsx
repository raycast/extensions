import { ActionPanel, Icon, List, Action } from "@raycast/api";

const GENERAL = [
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

const LAYOUT = [
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

const SURFACES = [
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

const DATA_ENTRY = [
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

const DATA_DISPLAY = [
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

const FEEDBACK = [
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

const NAVIGATION = [
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

const OTHERS = [
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
      <List.Section title="GENERAL">
        {GENERAL.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="LAYOUT">
        {LAYOUT.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="SURFACES">
        {SURFACES.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="DATA ENTRY">
        {DATA_ENTRY.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="DATA DISPLAY">
        {DATA_DISPLAY.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="FEEDBACK">
        {FEEDBACK.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="NAVIGATION">
        {NAVIGATION.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="OTHERS">
        {OTHERS.map((item) => (
          <List.Item
            key={item.title}
            icon={{ source: Icon.Link }}
            title={item.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
