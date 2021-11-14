import {
  ActionPanel,
  popToRoot,
  closeMainWindow,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { HistoryEntry, useEdgeHistorySearch } from "./hooks/useHistorySearch";
import { useEffect, useState, ReactElement } from "react";
import { faviconUrl, urlParser } from "./utils";
import { Tab } from "./lib/Tab";
import { TabListItem } from "./components/TabListItem";
import { getOpenTabs } from "./common/getOpenTabs";
import { NullableString } from "./schema/types";

async function openNewTab(queryText: NullableString, url: NullableString): Promise<void> {
  const script =
    `
    tell application "Microsoft Edge"
      activate
      tell window 1
      set newTab to make new tab ` +
    (url
      ? 'with properties {URL:"' + url + '"}'
      : queryText
      ? 'with properties {URL:"https://www.google.com/search?q=' + queryText + '"}'
      : "") +
    ` 
      end tell
    end tell
  `;

  await runAppleScript(script);
  await popToRoot({ clearSearchBar: true });
  return closeMainWindow();
}

interface State {
  tabs?: Tab[];
}

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeHistorySearch(searchText);

  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();
  const [state, setState] = useState<State>({});

  async function getTabs(query: string | null) {
    let tabs = await getOpenTabs(useOriginalFavicon);

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

  const url = searchText ? urlParser(searchText) : null;
  const isUrl = !!url;

  useEffect(() => {
    getTabs(null);
  }, []);

  if (error) {
    showToast(ToastStyle.Failure, "An Error Occurred", error.toString());
  }

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
        getTabs(query);
      }}
      isLoading={isLoading}
      throttle={false}
    >
      <List.Section title="New Tab" key="new-tab">
        <List.Item
          id={searchText}
          title={isUrl ? "Open URL" : searchText ? 'Search "' + searchText + '"' : "Open empty tab"}
          icon={{ source: isUrl ? Icon.Link : searchText ? Icon.MagnifyingGlass : Icon.Plus }}
          actions={<NewTabActions query={searchText} url={url} />}
        />
      </List.Section>
      <List.Section title="Open Tabs" key="open-tabs">
        {state.tabs?.map((tab) => (
          <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entries?.map((e) => (
          <HistoryItem entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}

const NewTabActions = (props: { query: NullableString; url: NullableString }): ReactElement => {
  const query = props.query;
  const url = props.url;

  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item
        onAction={function () {
          openNewTab(query, url);
        }}
        title={url ? "Open URL" : query ? 'Search "' + query + '"' : "Open empty tab"}
      />
    </ActionPanel>
  );
};

const HistoryItem = (props: { entry: HistoryEntry }): ReactElement => {
  const { url, title } = props.entry;
  const id = props.entry.id.toString();
  const favicon = faviconUrl(64, url);

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
      <OpenInBrowserAction title="Open in Tab" url={url} />
      <CopyToClipboardAction title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel>
  );
};
