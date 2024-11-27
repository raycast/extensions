import { ActionPanel, List, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";

const BASE_URL = "https://www.radix-ui.com/";

export default function Command() {
  return (
    <List>
      {primitivesRoutes.map(({ label, pages }: RouteProps) => (
        <List.Section title={label} key={label}>
          {pages
            .filter((item) => !item.draft)
            .map((item) => (
              <List.Item
                key={item.slug}
                title={item.title}
                subtitle={getSubtitle(item)}
                keywords={[item.title, label]}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction url={`${BASE_URL}${item.slug}`} />
                    <CopyToClipboardAction title="Copy URL" content={`${BASE_URL}${item.slug}`} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

// Source:
// https://github.com/radix-ui/website/blob/main/lib/primitivesRoutes.ts
const primitivesRoutes = [
  {
    label: "Overview",
    pages: [
      { title: "Introduction", slug: "primitives/docs/overview/introduction" },
      { title: "Getting started", slug: "primitives/docs/overview/getting-started" },
      { title: "Accessibility", slug: "primitives/docs/overview/accessibility" },
      { title: "Releases", slug: "primitives/docs/overview/releases" },
    ],
  },

  {
    label: "Guides",
    pages: [
      { title: "Styling", slug: "primitives/docs/guides/styling" },
      { title: "Animation", slug: "primitives/docs/guides/animation" },
      { title: "Composition", slug: "primitives/docs/guides/composition" },
      { title: "Server side rendering", slug: "primitives/docs/guides/server-side-rendering" },
    ],
  },

  {
    label: "Components",
    pages: [
      { title: "Accordion", slug: "primitives/docs/components/accordion" },
      { title: "Alert Dialog", slug: "primitives/docs/components/alert-dialog" },
      { title: "Aspect Ratio", slug: "primitives/docs/components/aspect-ratio" },
      { title: "Avatar", slug: "primitives/docs/components/avatar" },
      { title: "Checkbox", slug: "primitives/docs/components/checkbox" },
      { title: "Collapsible", slug: "primitives/docs/components/collapsible" },
      { title: "Context Menu", slug: "primitives/docs/components/context-menu" },
      { title: "Dialog", slug: "primitives/docs/components/dialog" },
      { title: "Dropdown Menu", slug: "primitives/docs/components/dropdown-menu" },
      { title: "Form", slug: "primitives/docs/components/form", preview: true },
      { title: "Hover Card", slug: "primitives/docs/components/hover-card" },
      { title: "Label", slug: "primitives/docs/components/label" },
      { title: "Menubar", slug: "primitives/docs/components/menubar" },
      { title: "Navigation Menu", slug: "primitives/docs/components/navigation-menu" },
      { title: "Popover", slug: "primitives/docs/components/popover" },
      { title: "Progress", slug: "primitives/docs/components/progress" },
      { title: "Radio Group", slug: "primitives/docs/components/radio-group" },
      { title: "Scroll Area", slug: "primitives/docs/components/scroll-area" },
      { title: "Select", slug: "primitives/docs/components/select" },
      { title: "Separator", slug: "primitives/docs/components/separator" },
      { title: "Slider", slug: "primitives/docs/components/slider" },
      { title: "Switch", slug: "primitives/docs/components/switch" },
      { title: "Tabs", slug: "primitives/docs/components/tabs" },
      { title: "Toast", slug: "primitives/docs/components/toast" },
      { title: "Toggle", slug: "primitives/docs/components/toggle" },
      { title: "Toggle Group", slug: "primitives/docs/components/toggle-group" },
      { title: "Toolbar", slug: "primitives/docs/components/toolbar" },
      { title: "Tooltip", slug: "primitives/docs/components/tooltip" },
    ],
  },

  {
    label: "Utilities",
    pages: [
      { title: "Accessible Icon", slug: "primitives/docs/utilities/accessible-icon" },
      { title: "Announce", slug: "primitives/docs/utilities/announce", deprecated: true },
      { title: "Direction Provider", slug: "primitives/docs/utilities/direction-provider" },
      { title: "Id Provider", slug: "primitives/docs/utilities/id-provider", deprecated: true },
      { title: "Polymorphic", slug: "primitives/docs/utilities/polymorphic", deprecated: true },
      { title: "Portal", slug: "primitives/docs/utilities/portal" },
      { title: "Slot", slug: "primitives/docs/utilities/slot" },
      { title: "Visually Hidden", slug: "primitives/docs/utilities/visually-hidden" },
    ],
  },
];

function getSubtitle(item: PageProps) {
  if (item.deprecated) return "Deprecated";
  if (item.beta) return "Beta";

  return "";
}

type PageProps = {
  title: string;
  slug: string;
  draft?: boolean;
  deprecated?: boolean;
  beta?: boolean;
};

type RouteProps = {
  label: string;
  pages: PageProps[];
};
