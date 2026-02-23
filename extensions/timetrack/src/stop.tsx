import {
  showToast,
  Toast,
  popToRoot,
  Detail,
  confirmAlert,
  Alert,
  Icon,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { TimeTracker, ActiveTracking } from "./timeTracker";
import { LongSessionHandler } from "./long-session-handler";

export default function Command() {
  const [showLongSessionForm, setShowLongSessionForm] = useState(false);
  const [activeTracking, setActiveTracking] = useState<ActiveTracking | null>(
    null,
  );
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      const tracker = new TimeTracker();

      // Check for pending idle state — prompt the user instead of silently stopping
      const idleState = tracker.getIdleState();
      if (idleState) {
        const confirmed = await confirmAlert({
          title: "Idle Tracking Detected",
          message: `You were tracking "${idleState.client}". Have you been working on this client during the idle time?`,
          icon: Icon.QuestionMark,
          primaryAction: {
            title: "Yes, I was working",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "No, I wasn't",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          tracker.resumeFromIdle(idleState);
          // Now stop the resumed session normally
          const entry = tracker.stopTracking();
          const duration = tracker.formatDuration(entry?.durationMinutes || 0);
          await showToast({
            style: Toast.Style.Success,
            title: "Stopped Tracking",
            message: `"${idleState.client}" - ${duration} (idle time counted)`,
          });
        } else {
          tracker.stopFromIdle(idleState);
          await showToast({
            style: Toast.Style.Success,
            title: "Stopped Tracking",
            message: `"${idleState.client}" - idle time not counted`,
          });
        }
        await popToRoot();
        return;
      }

      // Check for long-running active session before stopping it
      const active = tracker.getActiveTracking();
      if (active) {
        const sessionMinutes = Math.round(
          (new Date().getTime() - active.startTime.getTime()) / 60000,
        );
        if (sessionMinutes > 60) {
          setActiveTracking(active);
          setShowLongSessionForm(true);
          return;
        }
      }

      // No long session, proceed with normal stop
      const entry = tracker.stopTracking();
      if (entry) {
        const duration = tracker.formatDuration(entry.durationMinutes || 0);
        await showToast({
          style: Toast.Style.Success,
          title: "Stopped Tracking",
          message: `"${entry.client}" - ${duration}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Active Tracking",
          message: "There's nothing currently being tracked",
        });
      }
      await popToRoot();
    }

    run();
  }, []);

  if (showLongSessionForm && activeTracking) {
    return (
      <LongSessionHandler
        activeTracking={activeTracking}
        onComplete={async () => {
          await popToRoot();
        }}
      />
    );
  }

  return <Detail isLoading={true} markdown="" />;
}
