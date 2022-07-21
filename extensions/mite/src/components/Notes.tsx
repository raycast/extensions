import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { TimeEntry } from "../model/TimeEntry";
import { getTimeEntries } from "../utils/api";
import { createMiteEntry } from "../utils/utils";
import NoteNew from "./NoteNew";

interface IProps {
  projectId: number;
  projectName: string;
  serviceId: number;
  serviceName: string;
}

interface State {
  loading: boolean;
  timeEntries: TimeEntry[];
}

export default function Notes({ projectId, projectName, serviceId, serviceName }: IProps) {
  const [state, setState] = useState<State>({ loading: true, timeEntries: [] });

  useEffect(() => {
    (async () => {
      try {
        const { data: timeEntries } = await getTimeEntries();
        setState({ loading: false, timeEntries: timeEntries });
      } catch (error) {
        setState((previous) => ({ ...previous, loading: false }));
      }
    })();
  }, []);

  return (
    <List
      isLoading={state.loading}
      navigationTitle={projectName + " > " + serviceName + " > Select Note"}
      searchBarPlaceholder="Browse Notes"
    >
      <List.Item
        key="0"
        title="New"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push
              title="Next"
              target={
                <NoteNew
                  projectId={projectId}
                  projectName={projectName}
                  serviceId={serviceId}
                  serviceName={serviceName}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Section title="Recent Notes">
        {state.timeEntries.map((entry) => {
          return (
            <List.Item
              key={Math.random()}
              title={entry.note}
              accessories={[{ text: entry.date_at.toString() }]}
              actions={
                <ActionPanel>
                  <Action title="Go" onAction={() => createMiteEntry(projectId, serviceId, entry.note)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
