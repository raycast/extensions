import { ActionPanel, Action, Icon, Keyboard, Color } from "@raycast/api";
import { StoreItem } from "../types";
import { FilterToggles } from "../hooks/useFilterToggles";
import {
  CATEGORY_COLORS,
  categoryIcon,
  changelogUrl,
  createStoreDeeplink,
  extractLatestChanges,
  MACOS_TINT_COLOR,
  WINDOWS_TINT_COLOR,
} from "../utils";
import { useChangelog } from "../hooks/useChangelog";
import { ChangelogDetail } from "./ChangelogDetail";

interface ExtensionActionsProps {
  item: StoreItem;
  items: StoreItem[];
  currentIndex: number;
  trackReadStatus: boolean;
  toggles: FilterToggles;
  categoryFilter: string | null;
  authorFilter: string | null;
  availableCategories: string[];
  onSetCategory: (category: string | null) => void;
  onSetAuthor: (author: string | null) => void;
  onToggleMacOS: () => Promise<void>;
  onToggleWindows: () => Promise<void>;
  onMarkAsRead?: (itemId: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onUndo?: () => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ExtensionActions({
  item,
  items,
  currentIndex,
  trackReadStatus,
  toggles,
  categoryFilter,
  authorFilter,
  availableCategories,
  onSetCategory,
  onSetAuthor,
  onToggleMacOS,
  onToggleWindows,
  onMarkAsRead,
  onMarkAllAsRead,
  onUndo,
  onRefresh,
  isRefreshing,
}: ExtensionActionsProps) {
  const storeDeeplink = createStoreDeeplink(item.url);
  const changelogBrowserUrl = item.extensionSlug ? changelogUrl(item.extensionSlug) : undefined;

  const { data: changelog } = useChangelog(item.extensionSlug);
  const latestChanges = changelog ? extractLatestChanges(changelog) : null;

  return (
    <ActionPanel>
      {item.type === "removed" ? (
        <>
          {item.prUrl && (
            <Action.OpenInBrowser
              title="Open Pull Request"
              url={item.prUrl}
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
        </>
      ) : (
        <>
          {item.extensionSlug && (
            <ActionPanel.Section title="Changelog">
              <Action.Push
                title="View Changelog"
                icon={Icon.Document}
                target={
                  <ChangelogDetail
                    slug={item.extensionSlug}
                    title={item.title}
                    items={items}
                    currentIndex={currentIndex}
                  />
                }
              />
              {latestChanges && (
                <Action.CopyToClipboard
                  title="Copy Recent Changes"
                  content={latestChanges}
                  icon={Icon.Clipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
              {changelogBrowserUrl && (
                <Action.OpenInBrowser
                  title="Open Changelog in Browser"
                  url={changelogBrowserUrl}
                  icon={Icon.Globe}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "l" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "l" },
                  }}
                />
              )}
            </ActionPanel.Section>
          )}

          <Action.OpenInBrowser
            title="Open in Browser"
            url={item.url}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />

          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Raycast Store"
              url={storeDeeplink}
              icon={Icon.RaycastLogoNeg}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
            />
            {/*
              CopyName, NOT a hand-written cmd+shift+c — that combo IS Common.Copy,
              which "Copy Recent Changes" already claims in this same panel. Writing it
              longhand looks like a distinct shortcut but resolves to the same keys, and
              ray lint does not check the ActionPanel conflict invariant.
            */}
            <Action.CopyToClipboard
              title="Copy Extension URL"
              content={item.url}
              shortcut={Keyboard.Shortcut.Common.CopyName}
              icon={Icon.Clipboard}
            />
          </ActionPanel.Section>
        </>
      )}

      <ActionPanel.Section>
        <Action
          title={isRefreshing ? "Refreshing…" : "Refresh"}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => !isRefreshing && onRefresh?.()}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Filters">
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title={toggles.showMacOS ? "Hide macOS-only Extensions" : "Show macOS-only Extensions"}
          icon={{ source: "platform-macos.svg", tintColor: MACOS_TINT_COLOR }}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "m" },
            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
          }}
          onAction={onToggleMacOS}
        />
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title={toggles.showWindows ? "Hide Windows-only Extensions" : "Show Windows-only Extensions"}
          icon={{ source: "platform-windows.svg", tintColor: WINDOWS_TINT_COLOR }}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "w" },
            Windows: { modifiers: ["ctrl", "shift"], key: "w" },
          }}
          onAction={onToggleWindows}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Refine">
        {availableCategories.length > 0 && (
          <ActionPanel.Submenu
            title="Filter by Category"
            icon={Icon.Tag}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "f" },
              Windows: { modifiers: ["ctrl", "shift"], key: "f" },
            }}
          >
            {categoryFilter && (
              <Action title="All Categories" icon={Icon.XMarkCircle} onAction={() => onSetCategory(null)} />
            )}
            {availableCategories.map((category) => (
              // The icon slot always shows the category's own glyph — the same one the
              // Categories tags use in the detail panel — so a category reads identically
              // wherever it appears. Selection is a ✓ appended to the title instead of
              // replacing the glyph, which keeps both signals visible at once.
              <Action
                key={category}
                title={categoryFilter === category ? `${category} ✓` : category}
                icon={{
                  source: categoryIcon(category),
                  tintColor: CATEGORY_COLORS[category] ?? Color.SecondaryText,
                }}
                onAction={() => onSetCategory(category)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        {authorFilter === item.authorName ? (
          <Action title="Clear Author Filter" icon={Icon.Person} onAction={() => onSetAuthor(null)} />
        ) : (
          <Action title="Show Only This Author" icon={Icon.Person} onAction={() => onSetAuthor(item.authorName)} />
        )}
        {(categoryFilter || authorFilter) && (
          <Action
            title="Clear All Filters"
            icon={Icon.XMarkCircle}
            onAction={() => {
              onSetCategory(null);
              onSetAuthor(null);
            }}
          />
        )}
      </ActionPanel.Section>

      {trackReadStatus && (
        <ActionPanel.Section title="Read Status">
          <Action
            title="Mark as Read"
            icon={Icon.CheckCircle}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "r" },
              Windows: { modifiers: ["ctrl", "shift"], key: "r" },
            }}
            onAction={() => onMarkAsRead?.(item.id)}
          />
          {onMarkAllAsRead && (
            <Action
              title="Mark All as Read"
              icon={Icon.CheckRosette}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "a" },
                Windows: { modifiers: ["ctrl", "shift"], key: "a" },
              }}
              onAction={onMarkAllAsRead}
            />
          )}
          {onUndo && (
            <Action
              title="Undo"
              icon={Icon.Undo}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "z" },
                Windows: { modifiers: ["ctrl"], key: "z" },
              }}
              onAction={onUndo}
            />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
