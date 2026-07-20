import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

interface LinkListItemProps {
  id: string;
  title: string;
  url: string;
  hostname: string;
  created_at?: string;
  tags?: string[];
  searchText?: string;
}

// Raycast extensions bundle independently (not part of the npm workspace),
// so we inline this rather than depending on @unstable-studios/tabstash-shared.
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function LinkListItem({
  id,
  title,
  url,
  hostname,
  created_at,
  tags,
  searchText,
}: LinkListItemProps) {
  const accessories: List.Item.Accessory[] = [
    { text: hostname, icon: Icon.Globe },
  ];

  if (tags && tags.length > 0) {
    const query = searchText?.toLowerCase() ?? "";
    const displayTag =
      (query && tags.find((t) => t.toLowerCase().includes(query))) || tags[0];
    accessories.unshift({ tag: displayTag });
  }

  if (created_at) {
    accessories.push({ text: relativeTime(created_at) });
  }

  return (
    <List.Item
      id={id}
      title={title || url}
      icon={getFavicon(url, { fallback: Icon.Link })}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.OpenInBrowser
            title="Open in TabStash"
            icon={Icon.Book}
            url={`https://tabsta.sh/item/${id}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={title || url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
