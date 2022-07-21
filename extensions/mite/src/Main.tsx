import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import React, { useEffect, useState } from "react";
import Projects from "./components/Projects";
import { MiteEntry } from "./model/MiteEntry";
import { TimeEntry } from "./model/TimeEntry";
import { getMostPopularTimeEntries, getTimeEntries, startTracker, stopTracker } from "./utils/api";
import { createMiteEntry, getTime, showMessageAndQuit } from "./utils/utils";

interface State {
  loading: boolean;
  timeEntries: TimeEntry[];
  mostPopularTimeEntries: { miteEntry: MiteEntry; occurrence: number }[];
}

export default function Main() {
  const [state, setState] = useState<State>({ loading: true, timeEntries: [], mostPopularTimeEntries: [] });
  const [showingDetail, setShowingDetail] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: timeEntries } = await getTimeEntries("today");
        const { data: mostPopularTimeEntries } = await getMostPopularTimeEntries(5);
        setState({ loading: false, timeEntries, mostPopularTimeEntries });
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  function getToggleAction() {
    return (
      <Action
        title="Toggle Detail"
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={() => setShowingDetail(!showingDetail)}
      />
    );
  }

  return (
    <List
      isLoading={state.loading}
      navigationTitle="Mite"
      searchBarPlaceholder="Browse..."
      isShowingDetail={showingDetail}
    >
      <List.Item
        key="0"
        title="New"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Next" target={<Projects></Projects>} />
            <Action
              title="Stop Timer"
              onAction={() =>
                stopTracker()
                  .then(() => {
                    showMessageAndQuit("Timer stopped");
                  })
                  .catch((error) => {
                    showHUD(error.message);
                  })
              }
            />
            {getToggleAction()}
          </ActionPanel>
        }
        detail={<List.Item.Detail markdown="Some Space for a nice chart...?" />}
      />
      <List.Section title="Today">
        {state.timeEntries.map((timeEntry) => {
          const hasActiveTimeTracking = typeof timeEntry.tracking?.minutes !== "undefined";
          const minutes = hasActiveTimeTracking ? (timeEntry.tracking?.minutes as number) : timeEntry.minutes;
          return (
            <List.Item
              key={timeEntry.id ? timeEntry.id : Math.random()}
              title={timeEntry.project_name + " > " + timeEntry.note}
              icon={hasActiveTimeTracking ? Icon.Clock : ""}
              accessories={[{ text: getTime(minutes) }]}
              detail={
                <List.Item.Detail
                  markdown={timeEntry.note}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Customer" text={timeEntry.customer_name} />
                      <List.Item.Detail.Metadata.Label title="Project" text={timeEntry.project_name} />
                      <List.Item.Detail.Metadata.Label title="Service" text={timeEntry.service_name} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Date"
                        text={new Date(timeEntry.date_at).toLocaleDateString("de-ch")}
                      />
                      <List.Item.Detail.Metadata.Label title="Time Spent" text={getTime(minutes)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Start Timer"
                    onAction={() => {
                      startTracker(timeEntry.id)
                        .then(() => {
                          showMessageAndQuit("Timer started");
                        })
                        .catch((error) => {
                          showHUD(error.message);
                        });
                    }}
                  />
                  {getToggleAction()}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Popular">
        {state.mostPopularTimeEntries.map((entry) => {
          const miteEntry: MiteEntry = entry.miteEntry;
          return (
            <List.Item
              key={Math.random()}
              title={miteEntry.note}
              accessories={[
                {
                  text: entry.occurrence.toString(),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Start"
                    onAction={() => {
                      createMiteEntry(miteEntry.project_id, miteEntry.service_id, miteEntry.note);
                    }}
                  />
                  {getToggleAction()}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
