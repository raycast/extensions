import { useEffect, useState } from "react";
import { List, LocalStorage, Icon, ActionPanel, Action, Color, Alert, confirmAlert } from "@raycast/api";
import { FocusLog } from "./types";
import { formatTime, formatDateTime } from "./utils/formatters";
import { ACTIVITY_COMPARISONS } from "./utils/constants";

export default function Command() {
  const [focusData, setFocusData] = useState<FocusLog | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const savedData = await LocalStorage.getItem<string>("focusLog");
      const savedPersonalBest = await LocalStorage.getItem<string>("personalBest");

      if (savedPersonalBest) {
        const bestTime = Number(savedPersonalBest);
        setPersonalBest(bestTime);
      }

      if (savedData) {
        const parsed: FocusLog = JSON.parse(savedData);
        setFocusData(parsed);
      } else {
        setFocusData({ dailyLogs: [], totalTime: 0, lastStart: 0 });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  function getActivityComparison(duration: number): string {
    const comparisons = ACTIVITY_COMPARISONS;

    const durationInMinutes = duration / 60; // Convert seconds to minutes

    let bestComparison = comparisons[0].activity;
    let closestTimeDifference = Math.abs(durationInMinutes - comparisons[0].time);
    let bestComparisonTimes = Math.floor(durationInMinutes / comparisons[0].time); // Calculate number of repetitions for the first activity

    comparisons.forEach(({ activity, time }) => {
      const timeDifference = Math.abs(durationInMinutes - time);
      const timesCompared = Math.floor(durationInMinutes / time); // Calculate how many times the activity fits in the given duration

      if (
        timeDifference < closestTimeDifference ||
        (timeDifference === closestTimeDifference && timesCompared > bestComparisonTimes)
      ) {
        bestComparison = activity;
        closestTimeDifference = timeDifference;
        bestComparisonTimes = timesCompared;
      }
    });

    return `${bestComparisonTimes}× ${bestComparison}`;
  }

  async function handleDeleteSession(sessionId: string) {
    const savedData = await LocalStorage.getItem<string>("focusLog");
    if (!savedData) return;

    const focusLog: FocusLog = JSON.parse(savedData);

    focusLog.dailyLogs = focusLog.dailyLogs.map((log) => ({
      ...log,
      sessions: log.sessions.filter((session) => session.id !== sessionId),
    }));

    focusLog.totalTime = focusLog.dailyLogs.reduce(
      (acc, log) => acc + log.sessions.reduce((sum, session) => sum + session.duration, 0),
      0,
    );

    await LocalStorage.setItem("focusLog", JSON.stringify(focusLog));
    setFocusData(focusLog);
  }

  function confirmDelete(sessionId: string) {
    confirmAlert({
      title: "Delete Session",
      message: "Are you sure you want to delete this session?",
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => handleDeleteSession(sessionId),
      },
    });
  }

  if (!focusData) {
    return <List isLoading={true} />;
  }

  const totalSessions = focusData.dailyLogs.reduce((acc, day) => acc + day.sessions.length, 0);
  const totalTime = focusData.totalTime;
  const avgSessionLength = totalSessions > 0 ? totalTime / totalSessions : 0;

  // Flatten all sessions from the daily logs, then sort by descending order of start time
  const allSessions = focusData.dailyLogs.flatMap((day) => day.sessions).sort((a, b) => b.startTime - a.startTime);

  return (
    <List navigationTitle="Flow Sessions" isShowingDetail>
      {allSessions.map((session) => (
        <List.Item
          key={session.id}
          title={formatDateTime(session.startTime)}
          subtitle={formatTime(session.duration)}
          icon={
            session.duration === Math.max(...allSessions.map((s) => s.duration))
              ? { source: Icon.Star, tintColor: Color.Blue }
              : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title="Delete Session"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={() => confirmDelete(session.id)}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Session Duration"
                    text={formatTime(session.duration)}
                    icon={Icon.Clock}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Start Time"
                    text={formatDateTime(session.startTime)}
                    icon={Icon.Calendar}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="End Time"
                    text={formatDateTime(session.endTime)}
                    icon={Icon.Calendar}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Overall Statistics" icon={Icon.Stars} />
                  <List.Item.Detail.Metadata.Label title="Total Sessions" text={totalSessions.toString()} />
                  <List.Item.Detail.Metadata.Label title="Total Flow Time" text={formatTime(totalTime)} />
                  <List.Item.Detail.Metadata.Label
                    title="Average Session Length"
                    text={formatTime(Math.floor(avgSessionLength))}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Activity Comparison"
                    text={getActivityComparison(session.duration)}
                  />
                  {personalBest && (
                    <List.Item.Detail.Metadata.Label
                      title="Personal Best"
                      text={formatTime(personalBest)}
                      icon={{ source: Icon.Star, tintColor: Color.Blue }}
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
