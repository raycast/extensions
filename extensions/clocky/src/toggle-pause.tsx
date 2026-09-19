import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getSessions, saveSessions } from "./storage";
import { getActiveSession, isoNow } from "./utils";

export default function Command() {
  const toggle = async () => {
    const sessions = await getSessions();
    const active = getActiveSession(sessions);
    if (!active) {
      await showToast(Toast.Style.Failure, "No active session to pause/resume");
      return;
    }
    active.pauses = active.pauses || [];
    const openPause = active.pauses.find((p) => !p.end);
    if (openPause) {
      openPause.end = isoNow();
      await showToast(Toast.Style.Success, "Resumed session");
    } else {
      active.pauses.push({ start: isoNow() });
      await showToast(Toast.Style.Success, "Paused session");
    }
    await saveSessions(sessions);
  };

  return (
    <Detail
      markdown={`# Pause / Resume

Toggle pause for the active session.`}
      actions={
        <ActionPanel>
          <Action title="Toggle Pause" onAction={toggle} />
        </ActionPanel>
      }
    />
  );
}
