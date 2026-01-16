import { ActionPanel, Action, List, showToast, Toast, Icon, confirmAlert, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { listRunningTimers, stopTimer, formatDuration, getUsername } from "./lib/api";
import { Timer } from "./lib/types";

export default function StopTimerCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [showAllMembers, setShowAllMembers] = useState(false);

  useEffect(() => {
    loadTimers();
  }, [showAllMembers]);

  async function loadTimers() {
    setIsLoading(true);
    try {
      const username = showAllMembers ? undefined : getUsername();
      const result = await listRunningTimers(username);
      if (result.result) {
        setTimers(result.timers);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load running timers",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStopTimer(timer: Timer) {
    try {
      const result = await stopTimer(timer.id);

      if (result.result && result.event) {
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Stopped",
          message: `${timer.project_description || "Timer"} - ${formatDuration(result.event.duration_minutes)}`,
        });
        // Refresh the list
        loadTimers();
      } else {
        throw new Error(result.error || "Failed to stop timer");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to stop timer",
      });
    }
  }

  async function handleStopAllTimers() {
    if (timers.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Stop All Timers",
      message: `Are you sure you want to stop all ${timers.length} running timer(s)?`,
      primaryAction: { title: "Stop All" },
    });

    if (!confirmed) return;

    let stoppedCount = 0;
    for (const timer of timers) {
      try {
        const result = await stopTimer(timer.id);
        if (result.result) {
          stoppedCount++;
        }
      } catch {
        // Continue with other timers
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Timers Stopped",
      message: `Stopped ${stoppedCount} of ${timers.length} timer(s)`,
    });

    loadTimers();
  }

  function formatStartTime(isoString: string | null): string {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  // Group timers by member
  const timersByMember = timers.reduce(
    (acc, timer) => {
      const memberName = timer.member_name || "Unknown";
      if (!acc[memberName]) {
        acc[memberName] = [];
      }
      acc[memberName].push(timer);
      return acc;
    },
    {} as Record<string, Timer[]>
  );

  const memberNames = Object.keys(timersByMember).sort();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search running timers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by member"
          value={showAllMembers ? "all" : "me"}
          onChange={(value) => setShowAllMembers(value === "all")}
        >
          <List.Dropdown.Item title="My Timers" value="me" />
          <List.Dropdown.Item title="All Timers" value="all" />
        </List.Dropdown>
      }
    >
      {timers.length > 1 && (
        <List.Section title="Actions">
          <List.Item
            title="Stop All Running Timers"
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            accessories={[{ text: `${timers.length} timers` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop All Timers"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={handleStopAllTimers}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {memberNames.map((memberName) => (
        <List.Section key={memberName} title={showAllMembers ? memberName : "Running Timers"}>
          {timersByMember[memberName].map((timer) => (
            <List.Item
              key={timer.id}
              title={timer.project_description || "Untitled Project"}
              subtitle={timer.client_name || undefined}
              icon={{ source: Icon.Clock, tintColor: Color.Green }}
              accessories={[
                timer.note ? { icon: Icon.Pencil, tooltip: timer.note } : {},
                { text: formatStartTime(timer.start), tooltip: "Started at" },
                {
                  tag: { value: formatDuration(timer.minutes_elapsed), color: Color.Orange },
                  tooltip: "Elapsed time",
                },
              ].filter((a) => Object.keys(a).length > 0)}
              actions={
                <ActionPanel>
                  <Action
                    title="Stop Timer"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => handleStopTimer(timer)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTimers} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && timers.length === 0 && (
        <List.EmptyView
          title="No Running Timers"
          description={showAllMembers ? "No one has any running timers" : "You don't have any running timers"}
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
