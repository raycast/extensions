import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { listRuns, NtnError, type Run, type Worker } from "../lib/ntn";
import { formatDateTime, parseRunName } from "../lib/format";
import LogsView from "./Logs";

type RunState = "running" | "success" | "failed";

function runState(run: Run): RunState {
  if (!run.endedAt) return "running";
  return run.exitCode === 0 ? "success" : "failed";
}

function stateIcon(state: RunState) {
  switch (state) {
    case "running":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

export default function RunsView({ worker }: { worker: Worker }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const items = await listRuns(worker.workerId);
      items.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
      setRuns(items);
    } catch (err) {
      const message = err instanceof NtnError ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to list runs",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Runs · ${worker.name}`}
      searchBarPlaceholder="Search runs by tool or ID"
    >
      {runs.map((run) => {
        const { key } = parseRunName(run.name);
        const state = runState(run);
        return (
          <List.Item
            key={run.runId}
            icon={stateIcon(state)}
            title={key}
            subtitle={run.runId}
            accessories={[
              {
                date: new Date(run.startedAt),
                tooltip: `Started ${formatDateTime(run.startedAt)}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Logs"
                  icon={Icon.Terminal}
                  target={<LogsView worker={worker} run={run} />}
                />
                <Action.CopyToClipboard
                  title="Copy Run ID"
                  content={run.runId}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={load}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && runs.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No runs yet"
          description={`No recorded runs for ${worker.name}.`}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
