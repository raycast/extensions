import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { StoreItem } from "../types";
import { FilterToggles } from "../hooks/useFilterToggles";
import { createStoreDeeplink, extractLatestChanges, MACOS_TINT_COLOR, WINDOWS_TINT_COLOR } from "../utils";
import { useChangelog } from "../hooks/useChangelog";
import { ChangelogDetail } from "./ChangelogDetail";

const GITHUB_EXTENSIONS_BASE = "https://github.com/raycast/extensions/blob/main/extensions";

interface ExtensionActionsProps {
  item: StoreItem;
  items: StoreItem[];
  currentIndex: number;
  trackReadStatus: boolean;
  toggles: FilterToggles;
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
  onToggleMacOS,
  onToggleWindows,
  onMarkAsRead,
  onMarkAllAsRead,
  onUndo,
  onRefresh,
  isRefreshing,
}: ExtensionActionsProps) {
  const storeDeeplink = createStoreDeeplink(item.url);
  const changelogBrowserUrl = item.extensionSlug
    ? `${GITHUB_EXTENSIONS_BASE}/${item.extensionSlug}/CHANGELOG.md`
    : undefined;

  const { data: changelog } = useChangelog(item.extensionSlug);
  const latestChanges = changelog ? extractLatestChanges(changelog) : null;

  return (
    <ActionPanel>
      {item.extensionSlug && (
        <ActionPanel.Section title="Changelog">
          <Action.Push
            title="View Changelog"
            icon={Icon.Document}
            target={
              <ChangelogDetail slug={item.extensionSlug} title={item.title} items={items} currentIndex={currentIndex} />
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
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
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
        <Action.OpenInBrowser title="Open in Raycast Store" url={storeDeeplink} icon={Icon.RaycastLogoNeg} />
        <Action.CopyToClipboard
          title="Copy Extension URL"
          content={item.url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

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
          onAction={onToggleMacOS}
        />
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case
          title={toggles.showWindows ? "Hide Windows-only Extensions" : "Show Windows-only Extensions"}
          icon={{ source: "platform-windows.svg", tintColor: WINDOWS_TINT_COLOR }}
          onAction={onToggleWindows}
        />
      </ActionPanel.Section>

      {trackReadStatus && (
        <ActionPanel.Section title="Read Status">
          <Action
            title="Mark as Read"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => onMarkAsRead?.(item.id)}
          />
          {onMarkAllAsRead && (
            <Action
              title="Mark All as Read"
              icon={Icon.CheckRosette}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={onMarkAllAsRead}
            />
          )}
          {onUndo && (
            <Action title="Undo" icon={Icon.Undo} shortcut={{ modifiers: ["cmd"], key: "z" }} onAction={onUndo} />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
