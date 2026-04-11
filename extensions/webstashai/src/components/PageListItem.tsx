import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { formatDate, getItemTypeIcon, getPageFavicon } from "../helpers/utils";
import type { Page } from "../types";
import PageDetail from "./PageDetail";

/** Fields shared by Page and SearchResult that the list item needs. */
export interface PageListItemData {
  id: string;
  url: string;
  title: string;
  domain: string;
  item_type?: string;
  primary_tag: string | null;
  saved_at: string;
  is_favorite?: number;
  is_pinned?: number;
}

export interface PageListItemActions {
  onToggleFavorite?: (pageId: string, newValue: 0 | 1) => Promise<void>;
  onTogglePin?: (pageId: string, newValue: 0 | 1) => Promise<void>;
  onDelete?: (pageId: string) => Promise<void>;
}

export default function PageListItem({
  page,
  actions: listActions,
}: {
  page: PageListItemData;
  actions?: PageListItemActions;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (page.is_pinned) {
    accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
  }
  if (page.is_favorite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  }
  if (page.primary_tag) {
    accessories.push({ tag: page.primary_tag });
  }
  accessories.push({
    icon: getItemTypeIcon(page.item_type as Page["item_type"]),
    tooltip: page.item_type ?? "webpage",
  });
  accessories.push({
    date: new Date(page.saved_at),
    tooltip: `Saved ${formatDate(page.saved_at)}`,
  });

  async function handleToggleFavorite() {
    const newValue: 0 | 1 = page.is_favorite ? 0 : 1;
    await listActions?.onToggleFavorite?.(page.id, newValue);
  }

  async function handleTogglePin() {
    const newValue: 0 | 1 = page.is_pinned ? 0 : 1;
    await listActions?.onTogglePin?.(page.id, newValue);
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Page",
      message: `Delete "${page.title || page.url}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Action.Style.Destructive as never,
      },
    });
    if (!confirmed) return;
    try {
      await listActions?.onDelete?.(page.id);
      await showToast({ style: Toast.Style.Success, title: "Page Deleted" });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete page",
      });
    }
  }

  return (
    <List.Item
      id={page.id}
      title={page.title || page.url}
      subtitle={page.domain}
      icon={getPageFavicon(page.url)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.Push
              title="View Details"
              icon={Icon.Sidebar}
              target={<PageDetail pageId={page.id} url={page.url} />}
            />
            <Action.OpenInBrowser url={page.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={page.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          {listActions && (
            <ActionPanel.Section title="Organize">
              {listActions.onToggleFavorite && (
                <Action
                  title={
                    page.is_favorite
                      ? "Remove from Favorites"
                      : "Add to Favorites"
                  }
                  icon={page.is_favorite ? Icon.StarDisabled : Icon.Star}
                  onAction={handleToggleFavorite}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              )}
              {listActions.onTogglePin && (
                <Action
                  title={page.is_pinned ? "Unpin" : "Pin"}
                  icon={Icon.Pin}
                  onAction={handleTogglePin}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
              )}
            </ActionPanel.Section>
          )}
          {listActions?.onDelete && (
            <ActionPanel.Section title="Advanced">
              <Action
                title="Delete Page"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDelete}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
