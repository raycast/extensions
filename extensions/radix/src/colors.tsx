import { ActionPanel, List, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";

const BASE_URL = "https://www.radix-ui.com/";

export default function ColorsCommand() {
  return (
    <List>
      {colorsRoutes.map(({ label, pages }: RouteProps) => (
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
// https://github.com/radix-ui/website/blob/main/lib/colorsRoutes.ts
const colorsRoutes = [
  {
    label: "Overview",
    pages: [
      {
        title: "Installation",
        slug: "colors/docs/overview/installation",
        draft: false,
      },
      {
        title: "Usage",
        slug: "colors/docs/overview/usage",
        draft: false,
      },
      {
        title: "Aliasing",
        slug: "colors/docs/overview/aliasing",
        draft: false,
      },
      {
        title: "Releases",
        slug: "colors/docs/overview/releases",
        draft: false,
      },
    ],
  },

  {
    label: "Palette Composition",
    pages: [
      {
        title: "Scales",
        slug: "colors/docs/palette-composition/scales",
        draft: false,
      },
      {
        title: "Composing a palette",
        slug: "colors/docs/palette-composition/composing-a-palette",
        draft: false,
      },
      {
        title: "Understanding the scale",
        slug: "colors/docs/palette-composition/understanding-the-scale",
        draft: false,
      },
    ],
  },

  {
    label: "Tests",
    pages: [
      { title: "Balance", slug: "colors/docs/tests/balance", draft: false },
      { title: "Contrast", slug: "colors/docs/tests/contrast", draft: false },
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
