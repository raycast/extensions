import { List, ActionPanel, Action, Icon } from "@raycast/api";

const DOC_CATEGORIES = [
  { title: "Fastly Docs", url: "https://www.fastly.com/documentation", icon: Icon.Book },
  { title: "Getting Started", url: "https://docs.fastly.com/en/guides/getting-started", icon: Icon.CheckList },
  { title: "Compute", url: "https://docs.fastly.com/en/guides/compute", icon: Icon.MemoryChip },
  { title: "Full-Site Delivery", url: "https://docs.fastly.com/en/guides/full-site-delivery/", icon: Icon.Globe },
  { title: "Security", url: "https://docs.fastly.com/en/guides/security", icon: Icon.Shield },
  { title: "Integrations", url: "https://docs.fastly.com/en/guides/integrations", icon: Icon.Switch },
  { title: "API Reference", url: "https://developer.fastly.com/reference/api", icon: Icon.Code },
  { title: "CLI Reference", url: "https://developer.fastly.com/reference/cli", icon: Icon.Terminal },
  { title: "Product Documentation", url: "https://docs.fastly.com/products/", icon: Icon.BulletPoints },
];

export default function ViewDocs() {
  return (
    <List>
      <List.Section title="Documentation">
        {DOC_CATEGORIES.map((category) => (
          <List.Item
            key={category.url}
            title={category.title}
            icon={category.icon}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={category.url} title={`Open ${category.title}`} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
