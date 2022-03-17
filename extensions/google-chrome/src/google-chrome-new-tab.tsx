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
import { HistoryEntry, useChromeHistorySearch } from "./browserHistory";
import { useEffect, useState, ReactElement } from "react";
import { faviconUrl } from "./utils";

class Tab {
  static readonly TAB_CONTENTS_SEPARATOR: string = "~~~";

  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly favicon: string,
    public readonly windowsIndex: number,
    public readonly tabIndex: number
  ) {}

  static parse(line: string): Tab {
    const parts = line.split(this.TAB_CONTENTS_SEPARATOR);

    return new Tab(parts[0], parts[1], parts[2], +parts[3], +parts[4]);
  }

  key(): string {
    return `${this.windowsIndex}${Tab.TAB_CONTENTS_SEPARATOR}${this.tabIndex}`;
  }

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  googleFavicon(): string {
    return faviconUrl(64, this.url);
  }
}

async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`
    : '""';

  const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Google Chrome"
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

  return openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));
}

async function openNewTab(queryText: string | null | undefined): Promise<boolean | string> {
  popToRoot();
  closeMainWindow({ clearRootSearch: true });

  const script =
    `
    tell application "Google Chrome"
      activate
      tell window 1
          set newTab to make new tab ` +
    (queryText ? 'with properties {URL:"https://www.google.com/search?q=' + queryText + '"}' : "") +
    ` 
      end tell
    end tell
  `;

  return await runAppleScript(script);
}

async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Google Chrome"
      activate
      set index of window (${tab.windowsIndex} as number) to (${tab.windowsIndex} as number)
      set active tab index of window (${tab.windowsIndex} as number) to (${tab.tabIndex} as number)
    end tell
  `);
}

interface State {
  tabs?: Tab[];
}

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, entries } = useChromeHistorySearch(searchText);

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
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<NewTabActions query={searchText} />}
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

const NewTabActions = (props: { query: string | undefined }): ReactElement => {
  const query = props.query;

  return (
    <ActionPanel title="New Tab">
      <ActionPanel.Item
        onAction={function () {
          openNewTab(query);
        }}
        title={query ? `Search "${query}"` : "Open Empty Tab"}
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

function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<TabListItemActions tab={props.tab} />}
      icon={props.useOriginalFavicon ? props.tab.favicon : props.tab.googleFavicon()}
    />
  );
}

function TabListItemActions(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <GoogleChromeGoToTab tab={props.tab} />
      <CopyToClipboardAction title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function GoogleChromeGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <ActionPanel.Item title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
