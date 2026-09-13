import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSessions, saveSessions } from "./storage";
import { closeSessionAt, formatTime, getActiveSession, getWorkAndBreak, isoNow, msToClock } from "./utils";
import { Session } from "./types";

export default function Command() {
  const [active, setActive] = useState<Session | null>(null);
  const [summary, setSummary] = useState<{ work: number; breaks: number; net: number } | null>(null);

  useEffect(() => {
    (async () => {
      const sessions = await getSessions();
      setActive(getActiveSession(sessions) ?? null);
    })();
  }, []);

  const endSession = async () => {
    const sessions = await getSessions();
    const activeSession = getActiveSession(sessions);
    if (!activeSession) {
      await showToast(Toast.Style.Failure, "No active session to clock out");
      return;
    }
    const endIso = isoNow();
    closeSessionAt(activeSession, endIso);
    await saveSessions(sessions);
    const totals = getWorkAndBreak(activeSession, endIso);
    setSummary({ work: totals.totalWork, breaks: totals.breaks, net: totals.net });
    setActive(null);
    await showToast(Toast.Style.Success, "Clocked out");
  };

  const summaryMarkdown = summary
    ? `## Summary\n\nWork: ${msToClock(summary.work)}\nBreaks: ${msToClock(summary.breaks)}\nNet: ${msToClock(summary.net)}`
    : active
      ? `## Active Session\n\nStarted: ${formatTime(active.start)}`
      : "No active session.";

  return (
    <Detail
      markdown={`# Clock Out

End the active work session and show a summary.\n\n${summaryMarkdown}`}
      actions={
        <ActionPanel>
          <Action title="End Session" onAction={endSession} />
        </ActionPanel>
      }
    />
  );
}
