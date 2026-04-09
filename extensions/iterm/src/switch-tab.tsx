import { Action, ActionPanel, Icon, List, closeMainWindow, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { checkIt2apiReady } from "./core/it2api";
import { Session, activateSession, listSessions } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

interface Tab {
  windowIndex: number;
  tabId: string;
  sessions: Session[];
}

const groupByTab = (sessions: Session[]): Tab[] => {
  const tabMap = new Map<string, Tab>();
  const windowOrder: string[] = [];

  for (const session of sessions) {
    if (!windowOrder.includes(session.windowId)) windowOrder.push(session.windowId);
    const key = `${session.windowId}::${session.tabId}`;
    if (!tabMap.has(key))
      tabMap.set(key, { windowIndex: windowOrder.indexOf(session.windowId) + 1, tabId: session.tabId, sessions: [] });
    tabMap.get(key)!.sessions.push(session);
  }

  return Array.from(tabMap.values());
};

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const prerequisite = useMemo(() => checkIt2apiReady(), []);

  const { tabs, it2apiError } = useMemo(() => {
    if (!prerequisite.ready) return { tabs: [] as Tab[], it2apiError: prerequisite.reason };
    try {
      return { tabs: groupByTab(listSessions()), it2apiError: undefined };
    } catch (e) {
      return { tabs: [] as Tab[], it2apiError: (e as Error).message };
    }
  }, [prerequisite]);

  const switchTo = async (session: Session) => {
    try {
      activateSession(session.id);
      await closeMainWindow();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }
      await showToast({ style: Toast.Style.Failure, title: "Cannot switch session", message: error.message });
    }
  };

  if (hasPermissionError) return <PermissionErrorScreen />;

  return (
    <List searchBarPlaceholder="Search sessions...">
      {it2apiError && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Cannot connect to iTerm2" description={it2apiError} />
      )}
      {!it2apiError && tabs.length === 0 && (
        <List.EmptyView icon={Icon.Terminal} title="No sessions found" description="No open iTerm sessions detected" />
      )}
      {tabs.map((tab) => (
        <List.Section key={`w${tab.windowIndex}-t${tab.tabId}`} title={`Window ${tab.windowIndex} · Tab ${tab.tabId}`}>
          {tab.sessions.map((session) => (
            <List.Item
              key={session.id}
              icon={Icon.Terminal}
              title={session.name}
              actions={
                <ActionPanel>
                  <Action title="Switch to Session" icon={Icon.Terminal} onAction={() => switchTo(session)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
