import { ActionPanel, Action, Icon, List } from "@raycast/api";

type Item = {
  title: string;
  path: string;
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
    title: "Icons",
    path: "icons",
    subtitle: "Styleguide",
  },
  {
    title: "Typography",
    path: "typography",
    subtitle: "Styleguide",
  },
  {
    title: "Materials",
    path: "materials",
    subtitle: "Styleguide",
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
    path: "book",
    subtitle: "Components",
  },
  {
    title: "Button",
    path: "button",
    subtitle: "Components",
  },
  {
    title: "Calendar",
    path: "calendar",
    subtitle: "Components",
  },
  {
    title: "Checkbox",
    path: "checkbox",
    subtitle: "Components",
  },
  {
    title: "Choicebox",
    path: "choicebox",
    subtitle: "Components",
  },
  {
    title: "Code Block",
    path: "code-block",
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
    title: "Command Menu",
    path: "command-menu",
    subtitle: "Components",
  },
  {
    title: "Context Card",
    path: "context-card",
    subtitle: "Components",
  },
  {
    title: "Context Menu",
    path: "context-menu",
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
    title: "Empty State",
    path: "empty-state",
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
    title: "Gauge",
    path: "gauge",
    subtitle: "Components",
  },
  {
    title: "Grid",
    path: "grid",
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
    path: "loading-dots",
    subtitle: "Components",
  },
  {
    title: "Material",
    path: "material",
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
    path: "pagination",
    subtitle: "Components",
  },
  {
    title: "Progress",
    path: "progress",
    subtitle: "Components",
  },
  {
    title: "Project Banner",
    path: "project-banner",
    subtitle: "Components",
  },
  {
    title: "Radio",
    path: "radio",
    subtitle: "Components",
  },
  {
    title: "Relative Time Card",
    path: "relative-time-card",
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
    title: "Slider",
    path: "slider",
    subtitle: "Components",
  },
  {
    title: "Snippet",
    path: "snippet",
    subtitle: "Components",
  },
  {
    title: "Spinner",
    path: "spinner",
    subtitle: "Components",
  },
  {
    title: "Split Button",
    path: "split-button",
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
    path: "theme-switcher",
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
];

export default function Command() {
  return (
    <List>
      {ITEMS.map((item) => (
        <List.Item
          key={item.path}
          icon={item.icon ? item.icon : item.subtitle === "Styleguide" ? Icon.Book : Icon.Box}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ icon: Icon.ArrowRight }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://vercel.com/geist/${item.path}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
