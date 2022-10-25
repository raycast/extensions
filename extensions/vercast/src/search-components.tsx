import { ActionPanel, Action, Icon, List } from "@raycast/api";
type Item = {
  title: string;
  path: string;
  subtitle: string;
};

const ITEMS: Item[] = [
  {
    title: "Next.js",
    path: "brands#next-js",
    subtitle: "Assets",
  },
  {
    title: "Vercel",
    path: "brands#vercel",
    subtitle: "Assets",
  },
  {
    title: "Color",
    path: "color",
    subtitle: "Styleguide",
  },
  {
    title: "Grid",
    path: "grid",
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
    title: "Button",
    path: "button",
    subtitle: "Components",
  },
  {
    title: "Capacity",
    path: "capacity",
    subtitle: "Components",
  },
  {
    title: "Checkbox",
    path: "checkbox",
    subtitle: "Components",
  },
  {
    title: "Collapse",
    path: "collapse",
    subtitle: "Components",
  },
  {
    title: "Combobox",
    path: "combobox",
    subtitle: "Components",
  },
  {
    title: "Description",
    path: "description",
    subtitle: "Components",
  },
  {
    title: "Drawer",
    path: "drawer",
    subtitle: "Components",
  },
  {
    title: "Entity",
    path: "entity",
    subtitle: "Components",
  },
  {
    title: "Error",
    path: "error",
    subtitle: "Components",
  },
  {
    title: "Feedback",
    path: "feedback",
    subtitle: "Components",
  },
  {
    title: "fieldset",
    path: "fieldset",
    subtitle: "Components",
  },
  {
    title: "File Tree",
    path: "file-tree",
    subtitle: "Components",
  },
  {
    title: "Footer",
    path: "footer",
    subtitle: "Components",
  },
  {
    title: "Icon",
    path: "icon",
    subtitle: "Components",
  },
  {
    title: "Image",
    path: "image",
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
    title: "Link",
    path: "link",
    subtitle: "Components",
  },
  {
    title: "Loading dots",
    path: "loading-dots",
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
    title: "Popover",
    path: "popover",
    subtitle: "Components",
  },
  {
    title: "Popover Menu",
    path: "popover-menu",
    subtitle: "Components",
  },
  {
    title: "Progress",
    path: "progress",
    subtitle: "Components",
  },
  {
    title: "Radio",
    path: "radio",
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
    path: "skeleton",
    subtitle: "Components",
  },
  {
    title: "Snippet",
    path: "snippet",
    subtitle: "Components",
  },
  {
    title: "Spacer",
    path: "spacer",
    subtitle: "Components",
  },
  {
    title: "Spinner",
    path: "spinner",
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
    title: "Tag",
    path: "tag",
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
    title: "Video",
    path: "video",
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
      {ITEMS.map((item) => (
        <List.Item
          key={item.path}
          icon={
            item.subtitle === "Styleguide" ? Icon.Book : item.subtitle === "Components" ? Icon.Box : "icon@dark.png"
          }
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.ArrowRight }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://vercel.com/design/${item.path}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
