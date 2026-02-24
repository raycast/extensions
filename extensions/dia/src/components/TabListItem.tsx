import { Action, ActionPanel, closeMainWindow, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import { focusTab, type Tab } from "../dia";
import { getAccessories, getSubtitle } from "../utils";

interface TabListItemProps {
  tab: Tab;
  searchText?: string;
  onTabAction?: () => void;
}

export function TabListItem({ tab, searchText, onTabAction }: TabListItemProps) {
  return (
    <List.Item
      icon={tab.url ? getFavicon(tab.url, { mask: Image.Mask.Circle }) : Icon.Globe}
      title={tab.title}
      subtitle={tab.url ? { value: getSubtitle(tab.url), tooltip: tab.url } : undefined}
      accessories={getAccessories(tab)}
      actions={
        <ActionPanel>
          {tab.url && (
            <Action.Open
              icon={Icon.Globe}
              title="Open in New Tab"
              target={tab.url}
              application="company.thebrowser.dia"
              onOpen={() => {
                onTabAction?.();
              }}
            />
          )}
          <Action
            icon={Icon.ArrowRight}
            title="Focus Existing Tab"
            shortcut={tab.url ? { modifiers: ["cmd"], key: "return" } : undefined}
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
          {searchText && (
            <Action.OpenInBrowser
              title="Search Google"
              url={`https://www.google.com/search?q=${encodeURIComponent(searchText)}`}
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onOpen={() => {
                onTabAction?.();
              }}
            />
          )}
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
