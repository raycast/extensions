import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSessions, getStatusLastSeenIso, saveSessions } from "./storage";
import { getActiveSession, isStatusCommandStale, isoNow, newSessionId } from "./utils";

export default function Command() {
  const [showStatusHint, setShowStatusHint] = useState(false);

  useEffect(() => {
    (async () => {
      const lastSeenIso = await getStatusLastSeenIso();
      setShowStatusHint(isStatusCommandStale(lastSeenIso, isoNow()));
    })();
  }, []);

  const start = async () => {
    const sessions = await getSessions();
    const active = getActiveSession(sessions);
    if (active) {
      await showToast(Toast.Style.Failure, "Already clocked in");
      return;
    }
    const session = { id: newSessionId(), start: isoNow(), pauses: [] };
    sessions.push(session);
    await saveSessions(sessions);
    await showToast(Toast.Style.Success, "Clocked in");
  };

  return (
    <Detail
      markdown={`# Clock In

Start a new work session.${
        showStatusHint
          ? "\n\n---\n\n_Enable the **Status** command in your menu bar to get notified about forgotten clock-ins/outs._"
          : ""
      }`}
      actions={
        <ActionPanel>
          <Action title="Start Session" onAction={start} />
        </ActionPanel>
      }
    />
  );
}
