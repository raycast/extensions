import { ActionPanel, Action, Icon, List } from "@raycast/api";
type Item = {
  title: string;
  path?: string;
  subtitle: string;
  icon?: string;
};

const ITEMS: Item[] = [
  {
    title: "Vercel",
    path: "brands#vercel",
    subtitle: "Assets",
    icon: "icon.png",
  },
  {
    title: "Next.js",
    path: "brands#next-js",
    subtitle: "Assets",
    icon: "next-js.svg",
  },
  {
    title: "Turbo",
    path: "brands#turbo",
    subtitle: "Assets",
    icon: "turbo.svg",
  },
  {
    title: "v0",
    path: "brands#v0",
    subtitle: "Assets",
    icon: "v0.png",
  },
  {
    title: "Colors",
    path: "colors",
    subtitle: "Styleguide",
  },
  {
    title: "Grid",
    path: "grid",
    subtitle: "Styleguide",
  },
  {
    title: "Typeface",
    subtitle: "Styleguide",
  },
  {
    title: "Icons",
    path: "icons",
    subtitle: "Styleguide",
  },
  {
    title: "Playground",
    path: "playground",
    subtitle: "Styleguide",
  },
  {
    title: "Autocomplete",
    path: "autocomplete",
    subtitle: "Components",
  },
  {
    title: "Avatar",
    path: "avatar",
    subtitle: "Components",
  },
  {
    title: "Badge",
    path: "badge",
    subtitle: "Components",
  },
  {
    title: "Book",
    subtitle: "Components",
  },
  {
    title: "Button",
    path: "button",
    subtitle: "Components",
  },
  {
    title: "Calendar",
    subtitle: "Components",
  },
  {
    title: "Checkbox",
    path: "checkbox",
    subtitle: "Components",
  },
  {
    title: "Choicebox",
    subtitle: "Components",
  },
  {
    title: "Code Block",
    subtitle: "Components",
  },
  {
    title: "Collapse",
    subtitle: "Components",
  },
  {
    title: "Combobox",
    subtitle: "Components",
  },
  {
    title: "Command Menu",
    subtitle: "Components",
  },
  {
    title: "Context Menu",
    subtitle: "Components",
  },
  {
    title: "Description",
    subtitle: "Components",
  },
  {
    title: "Drawer",
    subtitle: "Components",
  },
  {
    title: "Empty State",
    subtitle: "Components",
  },
  {
    title: "Error",
    subtitle: "Components",
  },
  {
    title: "Gauge",
    subtitle: "Components",
  },
  {
    title: "Grid",
    subtitle: "Components",
  },
  {
    title: "Input",
    path: "input",
    subtitle: "Components",
  },
  {
    title: "Keyboard Input",
    path: "keyboard-input",
    subtitle: "Components",
  },
  {
    title: "Loading dots",
    subtitle: "Components",
  },
  {
    title: "Material",
    subtitle: "Components",
  },
  {
    title: "Menu",
    path: "menu",
    subtitle: "Components",
  },
  {
    title: "Modal",
    path: "modal",
    subtitle: "Components",
  },
  {
    title: "Note",
    path: "note",
    subtitle: "Components",
  },
  {
    title: "Pagination",
    subtitle: "Components",
  },
  {
    title: "Progress",
    subtitle: "Components",
  },
  {
    title: "Project Banner",
    subtitle: "Components",
  },
  {
    title: "Radio",
    path: "radio",
    subtitle: "Components",
  },
  {
    title: "Relative Time Card",
    subtitle: "Components",
  },
  {
    title: "Scroller",
    path: "scroller",
    subtitle: "Components",
  },
  {
    title: "Select",
    path: "select",
    subtitle: "Components",
  },
  {
    title: "Show More",
    path: "show-more",
    subtitle: "Components",
  },
  {
    title: "Skeleton",
    subtitle: "Components",
  },
  {
    title: "Slider",
    subtitle: "Components",
  },
  {
    title: "Snippet",
    path: "snippet",
    subtitle: "Components",
  },
  {
    title: "Spinner",
    subtitle: "Components",
  },
  {
    title: "Split Button",
    subtitle: "Components",
  },
  {
    title: "Stack",
    path: "stack",
    subtitle: "Components",
  },
  {
    title: "Status Dot",
    path: "status-dot",
    subtitle: "Components",
  },
  {
    title: "Switch",
    path: "switch",
    subtitle: "Components",
  },
  {
    title: "Table",
    path: "table",
    subtitle: "Components",
  },
  {
    title: "Tabs",
    path: "tabs",
    subtitle: "Components",
  },
  {
    title: "Text",
    path: "text",
    subtitle: "Components",
  },
  {
    title: "Textarea",
    path: "textarea",
    subtitle: "Components",
  },
  {
    title: "Theme Switcher",
    subtitle: "Components",
  },
  {
    title: "Toast",
    path: "toast",
    subtitle: "Components",
  },
  {
    title: "Toggle",
    path: "toggle",
    subtitle: "Components",
  },
  {
    title: "Tooltip",
    path: "tooltip",
    subtitle: "Components",
  },
  {
    title: "Window",
    path: "window",
    subtitle: "Components",
  },
];

export default function Command() {
  return (
    <List>
      {ITEMS.map((item, idx) => (
        <List.Item
          key={idx}
          icon={item.icon ? item.icon : item.subtitle === "Styleguide" ? Icon.Book : Icon.Box}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.ArrowRight }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://vercel.com/geist/${item.path ?? item.title.replaceAll(" ", "-")}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}