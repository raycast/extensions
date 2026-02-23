import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { TimeTracker } from "./timeTracker";
import { useEffect, useState } from "react";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<string | null>(null);
  const [activeStartTime, setActiveStartTime] = useState<Date | null>(null);
  const [todaySummary, setTodaySummary] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    const handleIdleConfirmation = async () => {
      const tracker = new TimeTracker();

      // Check for pending idle confirmation
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
          await showToast({
            style: Toast.Style.Success,
            title: "Tracking Resumed",
            message: `Resumed tracking "${idleState.client}" and counted idle time`,
          });
        } else {
          tracker.stopFromIdle(idleState);
          await showToast({
            style: Toast.Style.Success,
            title: "Idle Time Not Counted",
            message: `Stopped tracking "${idleState.client}"`,
          });
        }
      }

      // Load current state
      const active = tracker.getActiveTracking();
      if (active) {
        tracker.updateActivity();
      }

      const todayEntries = tracker.getTodayEntries();
      const summary = tracker.getSummaryByClient(todayEntries);

      setActiveClient(active?.client || null);
      setActiveStartTime(active?.startTime || null);
      setTodaySummary(summary);
      setIsLoading(false);
    };

    handleIdleConfirmation();
  }, []);

  const tracker = new TimeTracker();

  const stopTracking = () => {
    const stopped = tracker.stopTracking();
    if (stopped) {
      setActiveClient(null);
      setActiveStartTime(null);

      const todayEntries = tracker.getTodayEntries();
      const summary = tracker.getSummaryByClient(todayEntries);
      setTodaySummary(summary);
    }
  };

  const getCurrentDuration = (): string => {
    if (!activeStartTime) return "0m";
    const now = new Date();
    const minutes = Math.round(
      (now.getTime() - activeStartTime.getTime()) / 60000,
    );
    return tracker.formatDuration(minutes);
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Currently Tracking">
        {activeClient ? (
          <List.Item
            title={activeClient}
            subtitle={`Started: ${activeStartTime?.toLocaleTimeString()}`}
            accessories={[
              {
                tag: { value: getCurrentDuration(), color: Color.Green },
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Tracking"
                  icon={Icon.Stop}
                  onAction={stopTracking}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item title="No active tracking" icon={Icon.QuestionMark} />
        )}
      </List.Section>

      <List.Section title="Today's Summary">
        {Array.from(todaySummary.entries()).length > 0 ? (
          Array.from(todaySummary.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([client, minutes]) => (
              <List.Item
                key={client}
                title={client}
                accessories={[
                  {
                    tag: {
                      value: tracker.formatDuration(minutes),
                      color: Color.Blue,
                    },
                    icon: Icon.Clock,
                  },
                ]}
              />
            ))
        ) : (
          <List.Item title="No entries today" icon={Icon.Calendar} />
        )}
      </List.Section>
    </List>
  );
}
