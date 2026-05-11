import { List, ActionPanel, Action } from "@raycast/api";
import { FC } from "react";
import { STATUS_TO_COLOR_MAP } from "../constants";
import { Run, Status } from "../types";
import { formatDuration, formatTime, getDateString } from "../utils";
import { RunDetail } from "./run-detail";
import { PipelineWithRuns } from "../flow";

interface RunsListProps {
  pipeline: PipelineWithRuns;
}

export const RunsList: FC<RunsListProps> = ({ pipeline }) => {
  return (
    <List isShowingDetail navigationTitle={`${pipeline.name} runs`}>
      {pipeline.runs && pipeline.runs.length > 0 ? (
        groupRunsByDate(pipeline.runs).map(([dateString, runsInGroup]) => (
          <List.Section key={dateString} title={dateString}>
            {runsInGroup.map((run) => {
              const { icon, color } = STATUS_TO_COLOR_MAP[run.status as Status];
              const duration = formatDuration(run.endTime - run.startTime);
              const target = `https://flow.aliyun.com/pipelines/${pipeline.id}/builds/${run.pipelineRunId}`;

              return (
                <List.Item
                  key={run.pipelineRunId}
                  icon={{
                    source: icon,
                    tintColor: color,
                  }}
                  title={`#${run.pipelineRunId} ${formatTime(run.startTime)}`}
                  keywords={[run.pipelineRunId.toString(), run.status.toLowerCase().toString()]}
                  subtitle={duration}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Browser" url={target} />
                    </ActionPanel>
                  }
                  detail={<RunDetail run={run} duration={duration} target={target} />}
                />
              );
            })}
          </List.Section>
        ))
      ) : (
        <List.EmptyView title="No runs available" />
      )}
    </List>
  );
};

function groupRunsByDate(runs: Run[]): [string, Run[]][] {
  const groups = new Map<string, Run[]>();

  runs.forEach((run) => {
    const dateString = getDateString(run.endTime);
    if (!groups.has(dateString)) {
      groups.set(dateString, []);
    }
    groups.get(dateString)!.push(run);
  });

  return Array.from(groups.entries()).sort((a, b) => {
    const dateA = new Date(a[0]).getTime();
    const dateB = new Date(b[0]).getTime();
    return dateB - dateA;
  });
}
