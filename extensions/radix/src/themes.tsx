import { ActionPanel, List, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";

const BASE_URL = "https://www.radix-ui.com/";

export default function ThemesCommand() {
  return (
    <List>
      {themesRoutes.map(({ label, pages }: RouteProps) => (
        <List.Section title={label} key={label}>
          {pages.map((item) => (
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
// https://github.com/radix-ui/website/blob/main/lib/themesRoutes.ts
const themesRoutes = [
  {
    label: "Overview",
    pages: [
      { title: "Getting started", slug: "themes/docs/overview/getting-started" },
      // { title: 'Vision', slug: 'themes/docs/overview/vision' },
      { title: "Releases", slug: "themes/docs/overview/releases" },
    ],
  },
  {
    label: "Theme",
    pages: [
      { title: "Overview", slug: "themes/docs/theme/overview" },
      { title: "Color", slug: "themes/docs/theme/color" },
      { title: "Dark mode", slug: "themes/docs/theme/dark-mode" },
      { title: "Visual style", slug: "themes/docs/theme/visual-style" },
      { title: "Typography", slug: "themes/docs/theme/typography" },
      { title: "Layout", slug: "themes/docs/theme/layout" },
      { title: "Breakpoints", slug: "themes/docs/theme/breakpoints" },
      { title: "Token reference", slug: "themes/docs/theme/token-reference" },
    ],
  },

  {
    label: "Layout",
    pages: [
      { title: "Box", slug: "themes/docs/components/box" },
      { title: "Flex", slug: "themes/docs/components/flex" },
      { title: "Grid", slug: "themes/docs/components/grid" },
      { title: "Container", slug: "themes/docs/components/container" },
      { title: "Section", slug: "themes/docs/components/section" },
    ],
  },
  {
    label: "Typography",
    pages: [
      { title: "Text", slug: "themes/docs/components/text" },
      { title: "Heading", slug: "themes/docs/components/heading" },
      { title: "Blockquote", slug: "themes/docs/components/blockquote" },
      { title: "Code", slug: "themes/docs/components/code" },
      { title: "Em", slug: "themes/docs/components/em" },
      { title: "Kbd", slug: "themes/docs/components/kbd" },
      { title: "Link", slug: "themes/docs/components/link" },
      { title: "Quote", slug: "themes/docs/components/quote" },
      { title: "Strong", slug: "themes/docs/components/strong" },
    ],
  },

  {
    label: "Components",
    pages: [
      { title: "Alert Dialog", slug: "themes/docs/components/alert-dialog" },
      { title: "Aspect Ratio", slug: "themes/docs/components/aspect-ratio" },
      { title: "Avatar", slug: "themes/docs/components/avatar" },
      { title: "Badge", slug: "themes/docs/components/badge" },
      { title: "Button", slug: "themes/docs/components/button" },
      { title: "Callout", slug: "themes/docs/components/callout" },
      { title: "Card", slug: "themes/docs/components/card" },
      { title: "Checkbox", slug: "themes/docs/components/checkbox" },
      { title: "Context Menu", slug: "themes/docs/components/context-menu" },
      { title: "Dialog", slug: "themes/docs/components/dialog" },
      { title: "Dropdown Menu", slug: "themes/docs/components/dropdown-menu" },
      { title: "Hover Card", slug: "themes/docs/components/hover-card" },
      { title: "Icon Button", slug: "themes/docs/components/icon-button" },
      { title: "Inset", slug: "themes/docs/components/inset" },
      { title: "Popover", slug: "themes/docs/components/popover" },
      { title: "Radio Group", slug: "themes/docs/components/radio-group" },
      { title: "Scroll Area", slug: "themes/docs/components/scroll-area" },
      { title: "Select", slug: "themes/docs/components/select" },
      { title: "Separator", slug: "themes/docs/components/separator" },
      { title: "Slider", slug: "themes/docs/components/slider" },
      { title: "Switch", slug: "themes/docs/components/switch" },
      { title: "Table", slug: "themes/docs/components/table" },
      { title: "Tabs", slug: "themes/docs/components/tabs" },
      { title: "Text Area", slug: "themes/docs/components/text-area" },
      { title: "Text Field", slug: "themes/docs/components/text-field" },
      { title: "Tooltip", slug: "themes/docs/components/tooltip" },
    ],
  },

  {
    label: "Utilities",
    pages: [
      { title: "Accessible Icon", slug: "themes/docs/components/accessible-icon" },
      { title: "Portal", slug: "themes/docs/components/portal" },
      { title: "Slot", slug: "themes/docs/components/slot" },
      { title: "Theme", slug: "themes/docs/components/theme" },
      { title: "Visually Hidden", slug: "themes/docs/components/visually-hidden" },
    ],
  },
];

function getSubtitle(item: PageProps) {
  if (item.deprecated) return "Deprecated";
  if (item.preview) return "Preview";

  return "";
}

type PageProps = {
  title: string;
  slug: string;
  deprecated?: boolean;
  preview?: boolean;
};

type RouteProps = {
  label: string;
  pages: PageProps[];
};
