import { List, Icon, Color } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { HistoryEntry, BookmarkItem } from "../interfaces";
import { DiaActions } from "./DiaActions";

/**
 * Helper function to safely get favicon for potentially invalid URLs
 */
function getSafeFavicon(url: string): { icon: List.Item.Props["icon"]; isInvalid: boolean } {
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      isInvalid: true,
    };
  }

  try {
    new URL(url);
    return { icon: getFavicon(url), isInvalid: false };
  } catch {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      isInvalid: true,
    };
  }
}

/**
 * List item component for displaying history entries
 */
function HistoryItem({ entry: { url, title, id }, type }: { entry: HistoryEntry; type: "History" | "Bookmark" }) {
  const { icon, isInvalid } = getSafeFavicon(url);

  return (
    <List.Item
      id={`${type}-${id}`}
      title={title}
      subtitle={url}
      icon={icon}
      accessories={
        isInvalid
          ? [{ text: "⚠️ Invalid URL - Cannot open", tooltip: "This URL uses an unsupported protocol" }]
          : undefined
      }
      actions={<DiaActions.TabHistory title={title} url={url} />}
    />
  );
}

/**
 * List item component for displaying bookmark items (folders and URLs)
 */
function BookmarkItemView({ item, onNavigate }: { item: BookmarkItem; onNavigate: (idPath: string[]) => void }) {
  if (item.type === "folder") {
    const childCount = item.children?.length || 0;
    return (
      <List.Item
        id={item.id}
        title={item.name}
        icon={{ source: Icon.Folder, tintColor: Color.Blue }}
        accessories={[{ text: `${childCount} item${childCount !== 1 ? "s" : ""}` }]}
        actions={<DiaActions.Folder item={item} onNavigate={onNavigate} />}
      />
    );
  }

  // URL bookmark
  if (item.url) {
    const { icon, isInvalid } = getSafeFavicon(item.url);
    const pathText = item.path.length > 1 ? item.path.slice(0, -1).join(" › ") : undefined;

    return (
      <List.Item
        id={item.id}
        title={item.name}
        subtitle={pathText}
        icon={icon}
        accessories={
          isInvalid ? [{ text: "⚠️ Invalid URL", tooltip: "This URL uses an unsupported protocol" }] : undefined
        }
        actions={<DiaActions.Bookmark item={item} />}
      />
    );
  }

  return null;
}

export const DiaListItems = {
  TabHistory: HistoryItem,
  Bookmark: BookmarkItemView,
};
