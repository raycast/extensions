import { ActionPanel, getPreferenceValues, Icon, List, showToast, ToastStyle } from "@raycast/api";
import { useEdgeHistorySearch } from "./hooks/useHistorySearch";
import { useEffect, useState, ReactElement } from "react";
import { urlParser } from "./utils";
import { Tab } from "./lib/Tab";
import { TabListItem } from "./components/TabListItem";
import { getOpenTabs } from "./common/getOpenTabs";
import { NullableString } from "./schema/types";
import { UrlListItem } from "./components/UrlListItem";
import { openNewTab } from "./common/openNewTab";
import { DEFAULT_ERROR_TITLE } from "./common/constants";

interface State {
  tabs?: Tab[];
  error?: boolean;
}

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useEdgeHistorySearch(searchText);
  const [state, setState] = useState<State>({});

  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  async function getTabs(query: string | null) {
    try {
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
    } catch (error) {
      setState({ tabs: [], error: true });
      showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, "Couldn't get open tabs");
    }
  }

  const url = searchText ? urlParser(searchText) : null;
  const isUrl = !!url;

  useEffect(() => {
    getTabs(null);
  }, []);

  if (error) {
    showToast(ToastStyle.Failure, DEFAULT_ERROR_TITLE, error.toString());
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
          <UrlListItem entry={e} key={e.id} />
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
        onAction={() => openNewTab(query, url)}
        icon={{ source: Icon.Link }}
        title={url ? "Open URL" : query ? 'Search "' + query + '"' : "Open Empty Tab"}
      />
    </ActionPanel>
  );
};
