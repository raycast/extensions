import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { isIt2apiAvailable } from "./core/it2api";
import { Session, activateSession, listSessions } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

interface Tab {
  windowId: string;
  tabId: string;
  sessions: Session[];
}

interface Window {
  windowId: string;
  tabs: Tab[];
}

const IT2API_HINT = "Enable Python API in iTerm2 → Preferences → General → Magic";

const groupByWindow = (sessions: Session[]): Window[] => {
  const tabMap = new Map<string, Tab>();
  const windowMap = new Map<string, Window>();

  for (const session of sessions) {
    const tabKey = `${session.windowId}::${session.tabId}`;
    if (!tabMap.has(tabKey)) tabMap.set(tabKey, { windowId: session.windowId, tabId: session.tabId, sessions: [] });
    tabMap.get(tabKey)!.sessions.push(session);
  }

  for (const tab of tabMap.values()) {
    if (!windowMap.has(tab.windowId)) windowMap.set(tab.windowId, { windowId: tab.windowId, tabs: [] });
    windowMap.get(tab.windowId)!.tabs.push(tab);
  }

  return Array.from(windowMap.values());
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const it2apiAvailable = isIt2apiAvailable();

  const { windows, it2apiError } = useMemo(() => {
    if (!it2apiAvailable) return { windows: [] as Window[], it2apiError: "it2api not found" };
    try {
      return { windows: groupByWindow(listSessions()), it2apiError: undefined };
    } catch (e) {
      return { windows: [] as Window[], it2apiError: (e as Error).message };
    }
  }, [it2apiAvailable]);

  const switchTo = async (tab: Tab) => {
    try {
      activateSession(tab.sessions[0].id);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Cannot switch tab", message: error.message });
    }
  };

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List searchBarPlaceholder="Search tabs...">
      {it2apiError && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot connect to iTerm2"
          description={`${it2apiError}\n\n${IT2API_HINT}`}
        />
      )}
      {!it2apiError && windows.length === 0 && (
        <List.EmptyView icon={Icon.Terminal} title="No tabs found" description="No open iTerm tabs detected" />
      )}
      {windows.map((window, i) => (
        <List.Section key={window.windowId} title={`Window ${i + 1}`}>
          {window.tabs.map((tab) => (
            <List.Item
              key={`${tab.windowId}::${tab.tabId}`}
              icon={Icon.AppWindowList}
              title={tab.sessions[0].name}
              subtitle={`Tab ${tab.tabId}`}
              accessories={tab.sessions.length > 1 ? [{ text: `${tab.sessions.length} panes` }] : []}
              actions={
                <ActionPanel>
                  <Action title="Switch to Tab" icon={Icon.AppWindowList} onAction={() => switchTo(tab)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
