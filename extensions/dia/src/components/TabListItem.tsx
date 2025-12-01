import { Action, ActionPanel, closeMainWindow, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import { focusTab, type Tab } from "../dia";
import { getSubtitle } from "../utils";

interface TabListItemProps {
  tab: Tab;
}

export function TabListItem({ tab }: TabListItemProps) {
  return (
    <List.Item
      icon={tab.url ? getFavicon(tab.url, { mask: Image.Mask.Circle }) : Icon.Globe}
      title={tab.title}
      subtitle={tab.url ? { value: getSubtitle(tab.url), tooltip: tab.url } : undefined}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowRight}
            title="Focus Tab"
            onAction={async () => {
              try {
                await focusTab(tab);
                await closeMainWindow();
              } catch (error) {
                await showFailureToast(error, {
                  title: "Failed focusing tab",
                });
              }
            }}
          />
          {tab.url && <Action.OpenInBrowser title="Open URL in New Tab" url={tab.url} />}
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
