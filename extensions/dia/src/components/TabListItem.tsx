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
          <Action
            icon={Icon.ArrowRight}
            title="Focus Tab"
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
          {tab.url && (
            <Action.OpenInBrowser
              title="Open URL in New Tab"
              url={tab.url}
              onOpen={() => {
                onTabAction?.();
              }}
            />
          )}
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
