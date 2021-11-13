import { ActionPanel, closeMainWindow, CopyToClipboardAction, getPreferenceValues, Icon, List } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";
import { Tab } from "./lib/Tab";

async function getOpenTabs(useOriginalFavicon: boolean): Promise<Tab[]> {
  const faviconFormula = useOriginalFavicon
    ? `execute of tab _tab_index of window _window_index javascript ¬
                    "document.head.querySelector('link[rel~=icon]').href;"`
    : '""';

  const openTabs = await runAppleScript(`
      set _output to ""
      tell application "Microsoft Edge"
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

async function setActiveTab(tab: Tab): Promise<void> {
  await runAppleScript(`
    tell application "Microsoft Edge"
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
  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function getTabs() {
      setState({ tabs: await getOpenTabs(useOriginalFavicon) });
    }

    getTabs();
  }, []);

  return (
    <List>
      {state.tabs?.map((tab) => (
        <TabListItem key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
      ))}
    </List>
  );
}

function TabListItem(props: { tab: Tab; useOriginalFavicon: boolean }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlDomain()]}
      actions={<Actions tab={props.tab} />}
      icon={props.useOriginalFavicon ? props.tab.favicon : props.tab.googleFavicon()}
    />
  );
}

function Actions(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <MicrosoftEdgeGoToTab tab={props.tab} />
      <CopyToClipboardAction title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}

function MicrosoftEdgeGoToTab(props: { tab: Tab }) {
  async function handleAction() {
    await setActiveTab(props.tab);
    await closeMainWindow();
  }

  return <ActionPanel.Item title="Open tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}
