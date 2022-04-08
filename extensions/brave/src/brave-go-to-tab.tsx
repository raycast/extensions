import { ActionPanel, CopyToClipboardAction, List, showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";
import Tab from "./components/tab";
import BraveGoToTab from "./components/brave-goto-tab";

async function getOpenTabs(): Promise<Tab[]> {
  await showToast(ToastStyle.Success, "Tabs", "Getting tabs");
  const faviconFormula = '""';

  let openTabs = "";
  try {
    openTabs = await runAppleScript(`
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
  } catch ({ message }) {
    await showToast(ToastStyle.Failure, "Failed to get tabs", `Error: ${message}`);
  }

  const tabs = openTabs
    .split("\n")
    .filter((line) => line.length !== 0)
    .map((line) => Tab.parse(line));

  await showToast(ToastStyle.Success, "Available tabs", tabs.length.toString());
  return tabs;
}

interface State {
  tabs?: Tab[];
}

export default function Command() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function getTabs() {
      setState({ tabs: await getOpenTabs() });
    }

    getTabs();
  }, []);

  return (
    <List>
      {state.tabs?.map((tab) => (
        <TabListItem key={tab.key()} tab={tab} />
      ))}
    </List>
  );
}

function TabListItem(props: { tab: Tab }) {
  return (
    <List.Item
      title={props.tab.title}
      subtitle={props.tab.urlWithoutScheme()}
      keywords={[props.tab.urlWithoutScheme()]}
      actions={<Actions tab={props.tab} />}
      icon={props.tab.braveFavicon()}
    />
  );
}

function Actions(props: { tab: Tab }) {
  return (
    <ActionPanel title={props.tab.title}>
      <BraveGoToTab tab={props.tab} />
      <CopyToClipboardAction title="Copy URL" content={props.tab.url} />
    </ActionPanel>
  );
}
