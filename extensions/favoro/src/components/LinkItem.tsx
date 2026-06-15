import { List, ActionPanel, Action, Icon } from "@raycast/api";
import type { SearchResultLink } from "../types";

interface LinkItemProps {
  link: SearchResultLink;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

/**
 * Extracts the domain from a URL for display
 */
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * A list item component for displaying a FAVORO link
 */
export function LinkItem({ link, isFavorite = false, onToggleFavorite }: LinkItemProps) {
  const { label, url, description, favicon } = link.attributes;
  const domain = getDomain(url);

  // Build accessories array
  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  }
  accessories.push({ text: domain });

  return (
    <List.Item
      title={label}
      subtitle={description ?? undefined}
      icon={favicon ? { source: favicon } : Icon.Link}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={url} />
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            {onToggleFavorite && (
              <Action
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={onToggleFavorite}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
