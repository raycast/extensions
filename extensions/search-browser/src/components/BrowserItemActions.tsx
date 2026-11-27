import { Action, ActionPanel, Icon, Keyboard, closeMainWindow, open, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { focusOpenTab, isAccessibilityPermissionError, openUrlInSearch } from "../lib/browser";
import { PRIVACY_ACCESSIBILITY_URL, SEARCH_BUNDLE_ID } from "../lib/constants";
import { SearchTab } from "../lib/types";
import { formatMarkdownLink } from "../lib/utils";

interface BrowserItemActionsProps {
  title: string;
  url: string;
  tab?: SearchTab;
  hasPinnedTabs?: boolean;
  isLoading?: boolean;
  primaryTitle?: string;
  onRefresh?: () => void;
  searchFallbackUrl?: string;
  searchFallbackTitle?: string;
}

export function BrowserItemActions({
  title,
  url,
  tab,
  hasPinnedTabs = false,
  isLoading = false,
  primaryTitle = "Open in Search Browser",
  onRefresh,
  searchFallbackUrl,
  searchFallbackTitle,
}: BrowserItemActionsProps) {
  const isLiveTab = tab?.source === "live";

  const handleOpenInSearch = async (targetUrl: string) => {
    try {
      await closeMainWindow();
      await openUrlInSearch(targetUrl);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to open in Search Browser" });
    }
  };

  const handleFocusTab = async () => {
    if (!tab) return;
    try {
      await closeMainWindow();
      await focusOpenTab(tab, { hasPinnedTabs, skipFastKeyCode: isLoading });
      await popToRoot();
    } catch (error) {
      if (isAccessibilityPermissionError(error)) {
        await showHUD("Grant Raycast Accessibility permission to switch background tabs");
        await open(PRIVACY_ACCESSIBILITY_URL);
        return;
      }
      await showFailureToast(error, { title: "Failed to switch to tab" });
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isLiveTab ? (
          <>
            <Action title="Switch to Tab" icon={Icon.Window} onAction={handleFocusTab} />
            <Action
              title="Open URL in New Tab"
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => handleOpenInSearch(url)}
            />
          </>
        ) : (
          <Action title={primaryTitle} icon={Icon.Globe} onAction={() => handleOpenInSearch(url)} />
        )}
        <Action.OpenInBrowser title="Open in Default Browser" url={url} shortcut={Keyboard.Shortcut.Common.OpenWith} />
        {searchFallbackUrl && searchFallbackTitle && (
          <Action
            title={searchFallbackTitle}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => handleOpenInSearch(searchFallbackUrl)}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Title"
          content={title}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        <Action.CopyToClipboard
          title="Copy as Markdown Link"
          content={formatMarkdownLink(title, url)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CreateQuicklink
          title="Create Quicklink"
          quicklink={{ name: title, link: url, application: SEARCH_BUNDLE_ID }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
        />
        {onRefresh && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
