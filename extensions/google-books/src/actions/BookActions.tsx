import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { getISBN, getLargeCover } from "../utils/books";
import { BookDetail } from "../views/BookDetail";
import { BookCover } from "../views/BookCover";
import type { ViewMode } from "../views/BookGrid";

export function BookActionSections({
  item,
  toggleDetail,
  viewMode,
  onViewModeChange,
  onClearSearch,
}: {
  item: VolumeItem;
  toggleDetail?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onClearSearch?: () => void;
}) {
  const hasCover = !!getLargeCover(item);
  const isbn = getISBN(item);
  const authors = item.volumeInfo?.authors?.join(", ");
  const link = item.volumeInfo?.infoLink ?? item.selfLink;

  return (
    <>
      <ActionPanel.Section>
        {link && <Action.OpenInBrowser url={link} />}
        <Action.Push icon={Icon.Text} title="View Book Description" target={<BookDetail item={item} />} />
        {hasCover && <Action.Push icon={Icon.Image} title="View Book Cover" target={<BookCover item={item} />} />}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {link && (
          <Action.CopyToClipboard
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Copy}
            title="Copy Link"
            content={link}
          />
        )}
        {authors && (
          <Action.CopyToClipboard
            icon={Icon.Person}
            title="Copy Author"
            content={authors}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        )}
        {isbn && (
          <Action.CopyToClipboard
            icon={Icon.BarCode}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Copy ISBN"
            content={isbn}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="View">
        {toggleDetail && (
          <Action
            icon={Icon.AppWindowSidebarLeft}
            title="Toggle Sidebar"
            onAction={toggleDetail}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        )}
        {viewMode !== "list" && (
          <Action
            icon={Icon.List}
            title="View Book List"
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={() => onViewModeChange("list")}
          />
        )}
        {viewMode !== "grid" && (
          <Action
            icon={Icon.AppWindowGrid3x3}
            title="Show Book Covers"
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => onViewModeChange("grid")}
          />
        )}
        {viewMode !== "categorized-grid" && (
          <Action
            icon={Icon.AppWindowGrid3x3}
            title="Show Book Covers (Sorted)"
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            onAction={() => onViewModeChange("categorized-grid")}
          />
        )}
        {onClearSearch && (
          <Action
            icon={Icon.XMarkCircle}
            title="Clear Search"
            onAction={onClearSearch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
