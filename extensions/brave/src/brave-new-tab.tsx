import {
  ActionPanel,
  popToRoot,
  closeMainWindow,
  CopyToClipboardAction,
  Icon,
  List,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { HistoryEntry, useBraveHistorySearch } from "./browserHistory";
import React, { useEffect, useState, ReactElement } from "react";
import { openNewTabWithUrl } from "./utils";
import Tab from "./components/tab";
import BraveOpenNewTab from "./components/brave-open-new-tab";
import { getFavicon } from "@raycast/utils";

async function getOpenTabs(): Promise<Tab[]> {
  const faviconFormula = '""';

  const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Brave Browser"
        set _window_index to 1
        repeat with w in windows
          set _tab_index to 1
          repeat with t in tabs of w
            set _title to get title of t
            set _url to get URL of t
            set _favicon to ${faviconFormula}
            set _output to (_output & _title & "${Tab.TAB_CONTENTS_SEPARATOR}" & _url & "${Tab.TAB_CONTENTS_SEPARATOR}" & _favicon & "${Tab.TAB_CONTENTS_SEPARATOR}" & _window_index & "${Tab.TAB_CONTENTS_SEPARATOR}" & _tab_index & "\\n")
            set _tab_index to _tab_index + 1
          end repeat
          set _window_index to _window_index + 1
          if _window_index > count windows then exit repeat
        end repeat
      end tell
      return _output
  `);

  const tabs = openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));

  await showToast(ToastStyle.Success, "Open tabs", tabs.length.toString());
  return tabs;
}

async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  const url = queryText ? `https://www.google.com/search?q=${encodeURIComponent(queryText)}` : queryText;
  return await openNewTabWithUrl(url);
}

async function setActiveTab(tab: Tab): Promise<void> {
  await popToRoot();
  await closeMainWindow({ clearRootSearch: true });
  await runAppleScript(`
    tell application "Brave Browser"
      activate
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
  `);
}

interface State {
  tabs?: Tab[];
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useBraveHistorySearch(searchText);

  const [state, setState] = useState<State>({});

  async function getTabs(query: string | null) {
    let tabs = await getOpenTabs();

    if (query) {
      tabs = tabs.filter(function (tab) {
        return (
          tab.title.toLowerCase().includes(query.toLowerCase()) ||
          tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase())
        );
      });
    }
    setState({ tabs: tabs });
  }

  useEffect(() => {
    getTabs(null);
  }, []);

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString());
  }

  return (
    <List
      onSearchTextChange={async function (query) {
        setSearchText(query);
        await getTabs(query);
      }}
      isLoading={isLoading}
      throttle={false}
    >
      <List.Section title="New Tab" key="new-tab">
        <List.Item
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<NewTabActions query={searchText} />}
        />
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entries?.map((e) => (
          <HistoryItem entry={e} key={e.id} />
        ))}
      </List.Section>
      <List.Section title="Open Tabs" key="open-tabs">
        {state.tabs?.map((tab) => (
          <TabListItem key={tab.key()} tab={tab} />
        ))}
      </List.Section>
    </List>
  );
}

const NewTabActions = (props: { query: string | undefined }): ReactElement => {
  const query = props.query;

  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item
        onAction={async () => {
          await openNewTab(query);
        }}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
      />
    </ActionPanel>
  );
};

const HistoryItem = (props: { entry: HistoryEntry }): ReactElement => {
  const { url, title } = props.entry;
  const id = props.entry.id.toString();
  const favicon = getFavicon(url);

  return (
    <List.Item
      id={id}
      title={title}
      subtitle={url}
      icon={favicon}
      actions={<HistoryItemActions entry={props.entry} />}
    />
  );
};

const HistoryItemActions = (props: { entry: HistoryEntry }): ReactElement => {
  const { title, url } = props.entry;

  return (
    <ActionPanel title={title}>
      <BraveOpenNewTab title="Open in Tab" url={url} />
      <CopyToClipboardAction title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
};

function TabListItem(props: { tab: Tab }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<TabListItemActions tab={props.tab} />}
      icon={props.tab.braveFavicon()}
    />
  );
}

function TabListItemActions(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <BraveGoToTab tab={props.tab} />
      <CopyToClipboardAction title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function BraveGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
