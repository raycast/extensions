import { ActionPanel, Action, List, Icon } from "@raycast/api";

const LINKS = [
  {
    title: "CoCart Documentation",
    url: "https://docs.cocartapi.com",
    icon: Icon.Book,
    section: "Documentation",
  },
  {
    title: "Getting Started",
    url: "https://docs.cocartapi.com/getting-started",
    icon: Icon.Star,
    section: "Documentation",
  },
  {
    title: "API Reference (v2)",
    url: "https://docs.cocartapi.com/api-reference/v2",
    icon: Icon.Code,
    section: "Documentation",
  },
  {
    title: "API Reference (v1)",
    url: "https://docs.cocartapi.com/api-reference/v1",
    icon: Icon.Code,
    section: "Documentation",
  },
  {
    title: "CLI Reference",
    url: "https://docs.cocartapi.com/cli-reference",
    icon: Icon.Terminal,
    section: "Documentation",
  },
  {
    title: "Breaking Changes",
    url: "https://docs.cocartapi.com/breaking-changes",
    icon: Icon.Warning,
    section: "Documentation",
  },
  {
    title: "CoCart Website",
    url: "https://cocartapi.com",
    icon: Icon.Globe,
    section: "Resources",
  },
  {
    title: "GitHub Repository",
    url: "https://github.com/cocart-headless",
    icon: Icon.Link,
    section: "Resources",
  },
  {
    title: "Discord",
    url: "https://cocartapi.com/community",
    icon: Icon.SpeechBubble,
    section: "Resources",
  },
  {
    title: "WordPress Community Plugin",
    url: "https://wordpress.org/plugins/cart-rest-api-for-woocommerce/",
    icon: Icon.Plug,
    section: "Resources",
  },
];

export default function QuickLinks() {
  const sections = [...new Set(LINKS.map((l) => l.section))];

  return (
    <List searchBarPlaceholder="Search quick links...">
      {sections.map((section) => (
        <List.Section key={section} title={section}>
          {LINKS.filter((l) => l.section === section).map((link) => (
            <List.Item
              key={link.url}
              title={link.title}
              icon={link.icon}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={link.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={link.url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
