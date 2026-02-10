import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";

// =============================================================================
// Types
// =============================================================================

interface FeedAuthor {
  name: string;
  url: string;
}

interface FeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  image: string;
  date_modified: string;
  author: FeedAuthor;
}

interface Feed {
  version: string;
  title: string;
  home_page_url: string;
  description: string;
  icon: string;
  items: FeedItem[];
}

// =============================================================================
// Constants
// =============================================================================

const FEED_URL = "https://www.raycast.com/store/feed.json";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parses the Raycast Store URL to extract author and extension name.
 * URL format: https://www.raycast.com/{author}/{extension}
 */
function parseExtensionUrl(url: string): { author: string; extension: string } {
  const path = url.replace("https://www.raycast.com/", "");
  const [author, extension] = path.split("/");
  return { author, extension };
}

/**
 * Creates a Raycast deeplink to open an extension in the Store.
 * Format: raycast://extensions/{author}/{extension}
 */
function createStoreDeeplink(url: string): string {
  const { author, extension } = parseExtensionUrl(url);
  return `raycast://extensions/${author}/${extension}`;
}

// =============================================================================
// Components
// =============================================================================

function ExtensionActions({ item }: { item: FeedItem }) {
  const storeDeeplink = createStoreDeeplink(item.url);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open in Raycast Store"
          url={storeDeeplink}
          icon={Icon.RaycastLogoNeg}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.OpenInBrowser title="Open in Browser" url={item.url} icon={Icon.Globe} />
        <Action.CopyToClipboard
          title="Copy Extension URL"
          content={item.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View Author Profile" url={item.author.url} icon={Icon.Person} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ExtensionListItem({ item }: { item: FeedItem }) {
  const modifiedDate = new Date(item.date_modified);

  return (
    <List.Item
      icon={{ source: item.image, fallback: Icon.Box }}
      title={item.title}
      subtitle={item.summary}
      accessories={[
        {
          icon: Icon.Person,
          text: item.author.name,
          tooltip: `Author: ${item.author.name}`,
        },
        {
          date: modifiedDate,
          tooltip: `Modified: ${modifiedDate.toLocaleString()}`,
        },
      ]}
      actions={<ExtensionActions item={item} />}
    />
  );
}

// =============================================================================
// Command
// =============================================================================

export default function Command() {
  const { data, isLoading } = useFetch<Feed>(FEED_URL, {
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search extensions...">
      {items.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Extensions Found" description="Unable to load the feed" />
      ) : (
        items.map((item) => <ExtensionListItem key={item.id} item={item} />)
      )}
    </List>
  );
}
