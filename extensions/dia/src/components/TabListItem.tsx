import { Action, ActionPanel, closeMainWindow, getPreferenceValues, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon, showFailureToast, type MutatePromise } from "@raycast/utils";
import { closeTab, focusTab, TabNotFoundError, type Tab } from "../dia";
import { getSearchActionTitle, getSearchEngine, getSearchUrl } from "../search-engines";
import { getAccessories, getSubtitle } from "../utils";

interface TabListItemProps {
  tab: Tab;
  searchText?: string;
  onTabAction?: () => void;
  mutateTabs?: MutatePromise<Tab[] | undefined>;
}

export function TabListItem({ tab, searchText, onTabAction, mutateTabs }: TabListItemProps) {
  const { defaultTabAction } = getPreferenceValues<Preferences.Search>();
  const searchEngine = searchText ? getSearchEngine() : undefined;

  const focusAction = (
    <Action
      icon={Icon.ArrowRight}
      title="Focus Existing Tab"
      shortcut={defaultTabAction === "focus" ? undefined : { modifiers: ["cmd"], key: "return" }}
      onAction={async () => {
        try {
          await focusTab(tab);
          await closeMainWindow();
          onTabAction?.();
        } catch (error) {
          await showFailureToast(error, {
            title: "Failed focusing tab",
          });
        }
      }}
    />
  );

  const openAction = tab.url ? (
    <Action.Open
      icon={Icon.Globe}
      title="Open in New Tab"
      target={tab.url}
      application="company.thebrowser.dia"
      shortcut={defaultTabAction === "open" ? undefined : { modifiers: ["cmd"], key: "return" }}
      onOpen={() => {
        onTabAction?.();
      }}
    />
  ) : null;

  const primaryAction = defaultTabAction === "focus" ? focusAction : openAction;
  const secondaryAction = defaultTabAction === "focus" ? openAction : focusAction;

  return (
    <List.Item
      icon={tab.url ? getFavicon(tab.url, { mask: Image.Mask.Circle }) : Icon.Globe}
      title={tab.title}
      subtitle={tab.url ? { value: getSubtitle(tab.url), tooltip: tab.url } : undefined}
      accessories={getAccessories(tab)}
      actions={
        <ActionPanel>
          {primaryAction}
          {secondaryAction}
          {searchText && (
            <Action.OpenInBrowser
              title={getSearchActionTitle(searchEngine)}
              url={getSearchUrl(searchText, searchEngine)}
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onOpen={() => {
                onTabAction?.();
              }}
            />
          )}
          <ActionPanel.Section>
            <Action
              icon={Icon.XMarkCircle}
              title="Close Tab"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              onAction={async () => {
                try {
                  if (mutateTabs) {
                    // Optimistically drop the row so rapid-fire closes stay snappy;
                    // roll back and refetch only if the browser rejects the close.
                    await mutateTabs(closeTab(tab), {
                      optimisticUpdate: (data) =>
                        data?.filter((t) => !(t.windowId === tab.windowId && t.tabId === tab.tabId)),
                      rollbackOnError: true,
                      shouldRevalidateAfter: false,
                    });
                  } else {
                    await closeTab(tab);
                    onTabAction?.();
                  }
                } catch (error) {
                  if (error instanceof TabNotFoundError) {
                    // Tab is already gone or its IDs are stale — refetch to reconcile the list.
                    onTabAction?.();
                  } else {
                    await showFailureToast(error, { title: "Failed closing tab" });
                  }
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {tab.url && (
              <>
                <Action.CopyToClipboard content={tab.url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard
                  content={{ html: `<a href="${tab.url}">${tab.title || "Untitled"}</a>` }}
                  title="Copy Formatted URL"
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
              </>
            )}
            <Action.CopyToClipboard
              content={tab.title || "Untitled"}
              title="Copy Title"
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            {tab.url && (
              <Action.CopyToClipboard content={`[${tab.title || "Untitled"}](${tab.url})`} title="Copy as Markdown" />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
