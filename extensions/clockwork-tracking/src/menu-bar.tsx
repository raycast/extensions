import { useEffect, useState } from "react";
import { MenuBarExtra, Icon, open, launchCommand, LaunchType, getPreferenceValues } from "@raycast/api";
import { getTrackingState, clearTrackingState } from "./storage";
import { stopTimer } from "./api";
import { formatDuration, getElapsedTime } from "./utils";
import { TrackingState, Preferences } from "./types";

export default function Command() {
  const [state, setState] = useState<TrackingState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { jiraBaseUrl } = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (!state?.isTracking || !state.startedAt) return;

    setElapsedTime(getElapsedTime(state.startedAt));

    const interval = setInterval(() => {
      if (state.startedAt) {
        setElapsedTime(getElapsedTime(state.startedAt));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [state]);

  async function loadState() {
    setIsLoading(true);
    const trackingState = await getTrackingState();
    setState(trackingState);
    if (trackingState.isTracking && trackingState.startedAt) {
      setElapsedTime(getElapsedTime(trackingState.startedAt));
    }
    setIsLoading(false);
  }

  async function handleStopTracking() {
    if (!state?.issueKey) return;

    try {
      await stopTimer(state.issueKey);
      await clearTrackingState();
      setState({ isTracking: false, issueKey: null, startedAt: null });
      setElapsedTime(0);
    } catch (error) {
      console.error("Failed to stop timer:", error);
    }
  }

  async function openViewTimeEntries() {
    await launchCommand({ name: "view-time-entries", type: LaunchType.UserInitiated });
  }

  async function openStartTracking() {
    await launchCommand({ name: "start-tracking", type: LaunchType.UserInitiated });
  }

  function openClockwork() {
    const url = `${jiraBaseUrl}/plugins/servlet/ac/clockwork-cloud/clockwork-mywork`;
    open(url);
  }

  function openCurrentIssue() {
    if (state?.issueKey) {
      open(`${jiraBaseUrl}/browse/${state.issueKey}`);
    }
  }

  const isTracking = state?.isTracking && state.issueKey;
  const title = isTracking ? `${state.issueKey} ${formatDuration(elapsedTime)}` : undefined;

  return (
    <MenuBarExtra icon={Icon.Clock} title={title} isLoading={isLoading}>
      {isTracking ? (
        <>
          <MenuBarExtra.Item
            title={`Tracking: ${state.issueKey}`}
            subtitle={formatDuration(elapsedTime)}
            icon={Icon.Clock}
          />
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item
            title="Stop Tracking"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleStopTracking}
          />
          <MenuBarExtra.Item
            title="Open Issue in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={openCurrentIssue}
          />
        </>
      ) : (
        <MenuBarExtra.Item
          title="Start Tracking"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={openStartTracking}
        />
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="View Today's Time" icon={Icon.Calendar} onAction={openViewTimeEntries} />
      <MenuBarExtra.Item title="Open Clockwork in Jira" icon={Icon.Link} onAction={openClockwork} />
    </MenuBarExtra>
  );
}
