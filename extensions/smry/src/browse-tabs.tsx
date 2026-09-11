import { Action, ActionPanel, BrowserExtension, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getSmryPreferences } from "./preferences";
import { saveWithFeedback } from "./save-command";
import { getHostname, type SaveDestination } from "./smry";
import { readableTabTitle, supportedTabs, type BrowserTab } from "./tabs";

function tabDetail(tab: BrowserTab): string {
  const title = readableTabTitle(tab);
  const url = tab.url;
  return [
    `# ${title}`,
    "",
    `**${getHostname(url)}**`,
    "",
    `[Open original page](${url})`,
    "",
    "---",
    "",
    "Choose **Save for Later** or **Save to Inbox**. SMRY receives rendered page content only after you save.",
  ].join("\n");
}

function destinationIcon(destination: SaveDestination): Icon {
  return destination === "later" ? Icon.Bookmark : Icon.Tray;
}

function destinationActionTitle(destination: SaveDestination): string {
  return destination === "later" ? "Save for Later" : "Save to Inbox";
}

function TabActions(props: {
  tab: BrowserTab;
  primaryDestination: SaveDestination;
  refresh: () => void;
  toggleDetail: () => void;
}) {
  const { tab, primaryDestination, refresh, toggleDetail } = props;
  const alternateDestination: SaveDestination = primaryDestination === "later" ? "inbox" : "later";
  const save = (destination: SaveDestination) =>
    void saveWithFeedback({
      url: tab.url,
      title: readableTabTitle(tab),
      destination,
      tabId: tab.id,
    });

  return (
    <ActionPanel>
      <ActionPanel.Section title="Save to smry">
        <Action
          title={destinationActionTitle(primaryDestination)}
          icon={destinationIcon(primaryDestination)}
          onAction={() => save(primaryDestination)}
        />
        <Action
          title={destinationActionTitle(alternateDestination)}
          icon={destinationIcon(alternateDestination)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={() => save(alternateDestination)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={tab.url} title="Open Original Page" />
        <Action.CopyToClipboard content={tab.url} title="Copy Page URL" />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={toggleDetail}
        />
        <Action
          title="Refresh Tabs"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const { defaultSaveStatus } = getSmryPreferences();
  const { data: tabs = [], error, isLoading, revalidate } = usePromise(BrowserExtension.getTabs, []);
  const publicTabs = useMemo(() => supportedTabs(tabs), [tabs]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search open tabs by title or URL…"
      throttle
    >
      {publicTabs.length === 0 && !isLoading ? (
        <List.EmptyView
          title={error ? "Connect Raycast Browser Extension" : "No Public Tabs Found"}
          description={
            error
              ? "Install or reconnect Raycast's browser extension, then refresh."
              : "Open a public HTTP or HTTPS page in your browser, then refresh."
          }
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action title="Refresh Tabs" icon={Icon.ArrowClockwise} onAction={revalidate} />
              {error ? (
                <Action.OpenInBrowser
                  title="Install Browser Extension"
                  url="https://www.raycast.com/browser-extension"
                />
              ) : null}
            </ActionPanel>
          }
        />
      ) : null}

      {publicTabs.map((tab) => (
        <List.Item
          key={tab.id}
          title={readableTabTitle(tab)}
          subtitle={isShowingDetail ? undefined : getHostname(tab.url)}
          keywords={[tab.url, getHostname(tab.url)]}
          icon={tab.favicon ? { source: tab.favicon } : Icon.Globe}
          accessories={tab.active ? [{ tag: { value: "Active", color: Color.Green } }] : undefined}
          detail={<List.Item.Detail markdown={tabDetail(tab)} />}
          actions={
            <TabActions
              tab={tab}
              primaryDestination={defaultSaveStatus}
              refresh={revalidate}
              toggleDetail={() => setIsShowingDetail((current) => !current)}
            />
          }
        />
      ))}
    </List>
  );
}
