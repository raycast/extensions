import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { checkIt2apiReady } from "./core/it2api";
import { Session, activateSession, listSessions } from "./core/it2api-runner";
import { PermissionErrorScreen, isPermissionError } from "./core/permission-error-screen";

const tabLabel = (s: Session) => `Window ${s.windowId.slice(-4)} · Tab ${s.tabId}`;

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const prerequisite = useMemo(() => checkIt2apiReady(), []);

  const { sessions, it2apiError } = useMemo(() => {
    if (!prerequisite.ready) return { sessions: [] as Session[], it2apiError: prerequisite.reason };
    try {
      return { sessions: listSessions(), it2apiError: undefined };
    } catch (e) {
      return { sessions: [] as Session[], it2apiError: (e as Error).message };
    }
  }, [prerequisite]);

  const switchTo = async (session: Session) => {
    try {
      activateSession(session.id);
      await closeMainWindow();
      await popToRoot();
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
      {!it2apiError && sessions.length === 0 && (
        <List.EmptyView icon={Icon.Terminal} title="No sessions found" description="No open iTerm sessions detected" />
      )}
      {sessions.map((session) => (
        <List.Item
          key={session.id}
          icon={Icon.Terminal}
          title={session.name}
          subtitle={tabLabel(session)}
          actions={
            <ActionPanel>
              <Action title="Switch to Session" icon={Icon.Terminal} onAction={() => switchTo(session)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
