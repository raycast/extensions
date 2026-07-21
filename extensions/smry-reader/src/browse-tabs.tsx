import {
  Action,
  ActionPanel,
  BrowserExtension,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { buildReaderUrl, captureAndUpload, getHostname, isSupportedArticleUrl, type OpenMode } from "./smry";

type BrowserTab = Awaited<ReturnType<typeof BrowserExtension.getTabs>>[number];

function readableTabTitle(tab: BrowserTab): string {
  return tab.title?.trim() || getHostname(tab.url || "") || "Untitled Page";
}

function tabDetail(tab: BrowserTab): string {
  const title = readableTabTitle(tab);
  const url = tab.url || "";
  return [
    `# ${title}`,
    "",
    `**${getHostname(url)}**`,
    "",
    url,
    "",
    "---",
    "",
    "The selected URL and rendered page are sent to api.smry.ai only after you choose **Open in smry** or **Save in smry**.",
  ].join("\n");
}

async function performAction(tab: BrowserTab, mode: OpenMode): Promise<void> {
  if (typeof tab.id !== "number" || !isSupportedArticleUrl(tab.url)) {
    await showToast({ style: Toast.Style.Failure, title: "This tab cannot be opened in smry" });
    return;
  }

  const verb = mode === "save" ? "Saving" : "Opening";
  const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} article in smry…` });

  try {
    const snapshot = await captureAndUpload({
      tabId: tab.id,
      title: readableTabTitle(tab),
      articleUrl: tab.url,
      getContent: BrowserExtension.getContent,
    });
    await open(buildReaderUrl(tab.url, mode, snapshot));

    toast.style = Toast.Style.Success;
    toast.title = mode === "save" ? "Opened article to finish saving" : "Opened article in smry";
    toast.message = snapshot.ok ? "Rendered page sent on request" : "Opened from the public URL";
  } catch (error) {
    await showFailureToast(error, { title: `Could Not ${mode === "save" ? "Save" : "Open"} Article` });
  }
}

function TabActions(props: { tab: BrowserTab; refresh: () => void; toggleDetail: () => void }) {
  const { tab, refresh, toggleDetail } = props;
  const url = tab.url || "";

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Open in smry"
          icon={{ source: "icon.png", tintColor: Color.PrimaryText }}
          onAction={() => void performAction(tab, "open")}
        />
        <Action
          title="Save in smry"
          icon={Icon.Bookmark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={() => void performAction(tab, "save")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={url} title="Open Original Page" />
        <Action.CopyToClipboard content={url} title="Copy Page URL" />
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
  const { data: tabs = [], error, isLoading, revalidate } = usePromise(BrowserExtension.getTabs, []);

  const supportedTabs = useMemo(
    () =>
      tabs
        .filter((tab) => isSupportedArticleUrl(tab.url))
        .sort((left, right) => Number(Boolean(right.active)) - Number(Boolean(left.active))),
    [tabs],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search open tabs by title or URL…"
      throttle
    >
      {supportedTabs.length === 0 && !isLoading ? (
        <List.EmptyView
          title={error ? "Connect Raycast Browser Extension" : "No Article Tabs Found"}
          description={
            error
              ? "Install or reconnect Raycast's browser extension, then refresh."
              : "Open an HTTP or HTTPS page in your browser, then refresh."
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

      {supportedTabs.map((tab) => {
        const title = readableTabTitle(tab);
        const url = tab.url || "";
        return (
          <List.Item
            key={tab.id}
            title={title}
            subtitle={isShowingDetail ? undefined : getHostname(url)}
            keywords={[url, getHostname(url)]}
            icon={tab.favicon ? { source: tab.favicon } : Icon.Globe}
            accessories={tab.active ? [{ tag: { value: "Active", color: Color.Green } }] : undefined}
            detail={<List.Item.Detail markdown={tabDetail(tab)} />}
            actions={
              <TabActions
                tab={tab}
                refresh={revalidate}
                toggleDetail={() => setIsShowingDetail((current) => !current)}
              />
            }
          />
        );
      })}
    </List>
  );
}
