import { Action, ActionPanel, closeMainWindow, Icon, PopToRootType, showToast, Toast } from "@raycast/api";
import { closeTab, openNewTab, switchTab } from "../actions";
import { TAB_TYPE } from "../constants";
import { Tab } from "../interfaces";

export class TabActions {
  public static NewTab = NewTabAction;
  public static OpenTabListItem = OpenTabListItemAction;
}

function NewTabAction({ query }: { query?: string }) {
  return (
    <ActionPanel title="New Tab">
      <OpenNewTabAction query={query || ""} />
      <Action onAction={() => openNewTab(query)} title={query ? `Search "${query}"` : "Open Empty Tab"} />
    </ActionPanel>
  );
}

function OpenTabListItemAction(props: {
  isLoading: boolean;
  type: TAB_TYPE;
  tab: Tab;
  onCloseTab: (() => void) | undefined;
}) {
  const { isLoading, type, tab, onCloseTab } = props;
  return (
    <ActionPanel title={tab.title}>
      <GoToOpenTabAction tab={tab} type={type} isLoading={isLoading} />
      {onCloseTab ? <CloseTabAction tab={tab} onCloseTab={onCloseTab} /> : undefined}
      <Action.CopyToClipboard title="Copy URL" content={tab.url} />
    </ActionPanel>
  );
}

function CloseTabAction(props: { tab: Tab; onCloseTab: () => void }) {
  async function handleAction() {
    closeTab(props.tab);
    props.onCloseTab();
    await showToast({
      title: "",
      message: `Closed Tab !`,
      style: Toast.Style.Success,
    });
  }
  return <Action title="Close Tab" icon={{ source: Icon.XMarkCircle }} onAction={handleAction} />;
}

function GoToOpenTabAction(props: { isLoading: boolean; tab: Tab; type: TAB_TYPE }) {
  const { isLoading, type, tab } = props;
  async function handleAction() {
    // prevent the user to open tab
    if (isLoading) {
      return;
    }
    switch (type) {
      case TAB_TYPE.OPENED_TABS:
        switchTab(tab);
        break;
      case TAB_TYPE.RECENTLY_CLOSED:
      case TAB_TYPE.BOOKMARKS:
        openNewTab(tab.url);
        break;
    }
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }
  return <Action title="Open Tab" icon={{ source: Icon.Eye }} onAction={handleAction} />;
}

function OpenNewTabAction(props: { query: string }) {
  async function handleAction() {
    openNewTab(props.query);

    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }
  return <Action onAction={handleAction} title={props.query ? `Search "${props.query}"` : "Open Empty Tab"} />;
}
