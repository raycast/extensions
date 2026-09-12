import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { closeTab, focusTab, reloadTab, useTabs } from "./atlas";
import { getSubtitle } from "./utils";

/**
 * To be added later.
 *
 * The AppleScript to focus on tabs doesn't work yet, so parking this one for now.
 */
export default function Command() {
  const { isLoading, data } = useTabs();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tabs...">
      {data?.map((tab, index) => (
        <List.Item
          key={`${tab.windowId}-${tab.tabIndex}-${index}`}
          icon={getFavicon(tab.url, { mask: Image.Mask.Circle })}
          title={tab.title}
          subtitle={{ value: getSubtitle(tab.url), tooltip: tab.url }}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="Open Tab"
                onAction={async () => {
                  await focusTab(tab.windowId, tab.tabIndex);
                }}
              />
              <Action.OpenInBrowser title="Open URL in New Tab" url={tab.url} />
              <ActionPanel.Section>
                <Action.CopyToClipboard content={tab.url} title="Copy URL" shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard
                  content={{ html: `<a href="${tab.url}">${tab.title}</a>` }}
                  title="Copy Formatted URL"
                  shortcut={Keyboard.Shortcut.Common.CopyPath}
                />
                <Action.CopyToClipboard
                  content={tab.title}
                  title="Copy Title"
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                <Action.CopyToClipboard content={`[${tab.title}](${tab.url})`} title="Copy as Markdown" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Reload Tab"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={async () => {
                    await reloadTab(tab.windowId, tab.tabIndex);
                  }}
                />
                <Action
                  title="Close Tab"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    await closeTab(tab.windowId, tab.tabIndex);
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
