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

const IT2API_HINT = "Enable Python API in iTerm2 → Preferences → General → Magic";

const groupByTab = (sessions: Session[]): Tab[] => {
  const map = new Map<string, Tab>();
  for (const session of sessions) {
    const key = `${session.windowId}::${session.tabId}`;
    if (!map.has(key)) map.set(key, { windowId: session.windowId, tabId: session.tabId, sessions: [] });
    map.get(key)!.sessions.push(session);
  }
  return Array.from(map.values());
};

const tabLabel = (tab: Tab) => `Window ${tab.windowId.slice(-4)} · Tab ${tab.tabId}`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const it2apiAvailable = isIt2apiAvailable();

  const { tabs, it2apiError } = useMemo(() => {
    if (!it2apiAvailable) return { tabs: [] as Tab[], it2apiError: "it2api not found" };
    try {
      return { tabs: groupByTab(listSessions()), it2apiError: undefined };
    } catch (e) {
      return { tabs: [] as Tab[], it2apiError: (e as Error).message };
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
      {!it2apiError && tabs.length === 0 && (
        <List.EmptyView icon={Icon.Terminal} title="No tabs found" description="No open iTerm tabs detected" />
      )}
      {tabs.map((tab) => (
        <List.Item
          key={`${tab.windowId}::${tab.tabId}`}
          icon={Icon.AppWindowList}
          title={tab.sessions[0].name}
          subtitle={tabLabel(tab)}
          accessories={tab.sessions.length > 1 ? [{ text: `${tab.sessions.length} panes` }] : []}
          actions={
            <ActionPanel>
              <Action title="Switch to Tab" icon={Icon.AppWindowList} onAction={() => switchTo(tab)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
