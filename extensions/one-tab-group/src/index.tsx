import { useEffect, useState } from "react";
import {
  ActionPanel,
  Icon,
  Color,
  List,
  Action,
  useNavigation,
  Toast,
  showToast,
  getPreferenceValues,
} from "@raycast/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { flattenTabs } from "./utils";
import { License, Session, Menu } from "./types";
import { validateLicense } from "./api/validateLicense";
import { getSessionList } from "./api/getSessionList";

dayjs.extend(relativeTime);

interface State {
  license: License | null;
  sessionList: Session[];
  loading: boolean;
  error?: Error;
}

interface Preferences {
  licenseKey: string;
}

const mapCastColor = (colorName: string): Color => {
  const TAB_GROUP_COLORS: Record<string, Color> = {
    grey: Color.SecondaryText,
    blue: Color.Blue,
    red: Color.Red,
    yellow: Color.Yellow,
    green: Color.Green,
    pink: Color.Magenta,
    purple: Color.Purple,
    cyan: Color.PrimaryText,
    orange: Color.Orange,
  };

  return TAB_GROUP_COLORS[colorName];
};

function TabActions(props: { tab: Record<string, any> }) {
  return (
    <ActionPanel title={props.tab.title}>
      <ActionPanel.Section>{props.tab.url && <Action.OpenInBrowser url={props.tab.url} />}</ActionPanel.Section>
      <ActionPanel.Section>
        {props.tab.url && (
          <Action.CopyToClipboard
            content={props.tab.url}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function TabGroupRender(props: { group: Record<string, any> }) {
  const { group } = props;

  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(group);

  useEffect(() => {
    filterList(group.filter((item: any) => item.title.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Tabs"
      searchBarPlaceholder="Search Saved Tabs"
    >
      {filteredList &&
        filteredList.map((item: any) => (
          <List.Item
            icon={{ source: item.favIconUrl }}
            title={item.title}
            actions={<TabActions tab={item} />}
            key={item.id}
          />
        ))}
    </List>
  );
}

function TabTreeRender(props: { id: string; sessionList: Session[] }) {
  const { id } = props;

  const { push } = useNavigation();

  const idx = props.sessionList.findIndex((item) => item.id === id);

  const tabTree = idx !== -1 ? props.sessionList[idx].tabTree : ({} as any);

  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(tabTree);

  useEffect(() => {
    filterList(tabTree.filter((item: any) => item.title.includes(searchText)));
  }, [searchText]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Tabs & Tab Groups"
      searchBarPlaceholder="Search Sessions"
    >
      {filteredList &&
        filteredList.map((item: any) => {
          const hasGroup = item.children && item.children.length > 0;

          return (
            <List.Item
              icon={{
                source: hasGroup ? Icon.CircleFilled : (item.favIconUrl && item.favIconUrl) || Icon.Link,
                tintColor: hasGroup ? mapCastColor(item.color) : null,
              }}
              title={item.title}
              actions={
                hasGroup ? (
                  <ActionPanel>
                    <Action
                      title="Explore Tabs in Tab Group"
                      onAction={() => push(<TabGroupRender group={item.children} />)}
                    />
                  </ActionPanel>
                ) : (
                  <TabActions tab={item} />
                )
              }
              key={item.id}
              accessories={hasGroup ? [{ text: `${item.children.length} Tabs` }] : []}
            />
          );
        })}
    </List>
  );
}

function SessionRender(props: { state: State }) {
  const [menu, setMenu] = useState<Menu>(Menu.Sessions);
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState(props.state.sessionList);
  const [loadingSession, setLoadingSession] = useState(props.state.loading);

  const { push } = useNavigation();

  useEffect(() => {
    let list = props.state.sessionList.filter((item) => item.title.includes(searchText));
    list = menu === "favorites" ? list.filter((item) => item.starred) : list;
    filterList(list);
  }, [searchText, menu, props.state.sessionList]);

  useEffect(() => {
    setLoadingSession(props.state.loading);
  }, [props.state.loading]);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Saved Sessions"
      isLoading={loadingSession}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Menu" storeValue onChange={(newValue) => setMenu(newValue as Menu)}>
          {Object.entries(Menu).map(([name, value]) => (
            <List.Dropdown.Item key={value} title={name} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon="no-view.png" title="No Results Found" />
      {filteredList.map((session) => {
        const { tabs, tabGroups } = flattenTabs(session.tabTree);
        const createdtimeAgo = dayjs(Number(session.created_at)).fromNow();

        return (
          <List.Item
            icon="icon-512.png"
            title={session.title}
            subtitle={`Created at ${createdtimeAgo}`}
            actions={
              <ActionPanel>
                <Action
                  title="Explore Session"
                  onAction={() => push(<TabTreeRender id={session.id} sessionList={props.state.sessionList} />)}
                />
              </ActionPanel>
            }
            key={session.id}
            accessories={[{ text: `${tabs.length} Tabs(${tabGroups.length} Groups)` }]}
          />
        );
      })}
    </List>
  );
}

function SessionFetcher(props: { license: string }) {
  const [state, setState] = useState<State>({
    license: null,
    sessionList: [],
    loading: true,
  });

  useEffect(() => {
    async function fecthSessionList(accountId: string) {
      let sessionList: Session[] = [];
      try {
        const res = await getSessionList(accountId);
        sessionList = res.data;
      } catch (error: any) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed loading sessions",
          message: error,
        });
      }
      return sessionList;
    }

    async function fetchLicense() {
      try {
        const res = await validateLicense(props.license);
        const license = res.data;
        if (license?.account_id) {
          const sessionList = await fecthSessionList(license?.account_id);
          setState({ license, sessionList, loading: false });
        } else {
          setState({ license: null, sessionList: [], loading: false });
        }
      } catch (error: any) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed loading sessions",
          message: error,
        });
      }
    }

    fetchLicense();
  }, []);

  return <SessionRender state={state} />;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const licenseKey = preferences.licenseKey;

  return <SessionFetcher license={licenseKey} />;
}
