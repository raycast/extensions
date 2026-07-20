import { List, ActionPanel, Action, Icon } from "@raycast/api";

const FASTLY_DOCS_URL = "https://www.fastly.com/documentation/";
const DOC_CATEGORIES = [
  { title: "Fastly Docs", url: FASTLY_DOCS_URL, icon: Icon.Book },
  { title: "Getting Started", url: FASTLY_DOCS_URL + "guides/getting-started/", icon: Icon.CheckList },
  { title: "Compute", url: FASTLY_DOCS_URL + "guides/compute/", icon: Icon.MemoryChip },
  { title: "Full-Site Delivery", url: FASTLY_DOCS_URL + "guides/full-site-delivery/", icon: Icon.Globe },
  { title: "Security", url: FASTLY_DOCS_URL + "guides/security/", icon: Icon.Shield },
  { title: "Integrations", url: FASTLY_DOCS_URL + "guides/integrations/", icon: Icon.Switch },
  { title: "API Reference", url: FASTLY_DOCS_URL + "reference/api/", icon: Icon.Code },
  { title: "CLI Reference", url: FASTLY_DOCS_URL + "reference/cli/", icon: Icon.Terminal },
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
