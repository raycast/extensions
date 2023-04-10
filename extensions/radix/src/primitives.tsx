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
      { title: "Introduction", slug: "docs/primitives/overview/introduction" },
      { title: "Getting Started", slug: "docs/primitives/overview/getting-started" },
      { title: "Styling", slug: "docs/primitives/overview/styling" },
      { title: "Animation", slug: "docs/primitives/overview/animation" },
      { title: "Accessibility", slug: "docs/primitives/overview/accessibility" },
      { title: "Server Side Rendering", slug: "docs/primitives/overview/server-side-rendering" },
      { title: "Releases", slug: "docs/primitives/overview/releases" },
    ],
  },

  {
    label: "Components",
    pages: [
      { title: "Accordion", slug: "docs/primitives/components/accordion" },
      { title: "Alert Dialog", slug: "docs/primitives/components/alert-dialog" },
      { title: "Aspect Ratio", slug: "docs/primitives/components/aspect-ratio" },
      { title: "Avatar", slug: "docs/primitives/components/avatar" },
      { title: "Carousel", slug: "docs/primitives/components/carousel", draft: true },
      { title: "Checkbox", slug: "docs/primitives/components/checkbox" },
      { title: "Collapsible", slug: "docs/primitives/components/collapsible" },
      { title: "Context Menu", slug: "docs/primitives/components/context-menu" },
      { title: "Dialog", slug: "docs/primitives/components/dialog" },
      { title: "Dropdown Menu", slug: "docs/primitives/components/dropdown-menu" },
      { title: "Hover Card", slug: "docs/primitives/components/hover-card" },
      { title: "Label", slug: "docs/primitives/components/label" },
      { title: "Menubar", slug: "docs/primitives/components/menubar", draft: true },
      { title: "Navigation Menu", slug: "docs/primitives/components/navigation-menu" },
      { title: "Popover", slug: "docs/primitives/components/popover" },
      { title: "Progress", slug: "docs/primitives/components/progress" },
      { title: "Radio Group", slug: "docs/primitives/components/radio-group" },
      { title: "Scroll Area", slug: "docs/primitives/components/scroll-area" },
      { title: "Select", slug: "docs/primitives/components/select" },
      { title: "Separator", slug: "docs/primitives/components/separator" },
      { title: "Slider", slug: "docs/primitives/components/slider" },
      { title: "Switch", slug: "docs/primitives/components/switch" },
      { title: "Tabs", slug: "docs/primitives/components/tabs" },
      { title: "Toast", slug: "docs/primitives/components/toast" },
      { title: "Toggle", slug: "docs/primitives/components/toggle" },
      { title: "Toggle Group", slug: "docs/primitives/components/toggle-group" },
      { title: "Toolbar", slug: "docs/primitives/components/toolbar" },
      { title: "Tooltip", slug: "docs/primitives/components/tooltip" },
    ],
  },

  {
    label: "Utilities",
    pages: [
      { title: "Accessible Icon", slug: "docs/primitives/utilities/accessible-icon" },
      { title: "Announce", slug: "docs/primitives/utilities/announce", deprecated: true },
      { title: "Direction Provider", slug: "docs/primitives/utilities/direction-provider" },
      { title: "Id Provider", slug: "docs/primitives/utilities/id-provider", deprecated: true },
      { title: "Polymorphic", slug: "docs/primitives/utilities/polymorphic", deprecated: true },
      { title: "Portal", slug: "docs/primitives/utilities/portal" },
      { title: "Slot", slug: "docs/primitives/utilities/slot" },
      { title: "Visually Hidden", slug: "docs/primitives/utilities/visually-hidden" },
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
