import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import { Pipeline, PipelineGroup, Run, Status } from "./types";
import { CODEUP_HEADERS, DOMAIN, ORGANIZATION_ID, STATUS_TO_COLOR_MAP } from "./constants";
import { RunDetail } from "./components";
import { formatDate, formatDuration, formatRelativeTime, formatTime, getDateString } from "./utils";
import { Fragment } from "react/jsx-runtime";
import { useState } from "react";

export type PipelineWithRuns = Pipeline & { runs: Run[] };

export default function Command() {
  const { data: pipelineList, isLoading: listLoading } = useFetch<Pipeline[]>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines`,
    {
      headers: CODEUP_HEADERS,
    },
  );

  const { data: pipelineGroups, isLoading: groupLoading } = useFetch<PipelineGroup[]>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelineGroups`,
    {
      headers: CODEUP_HEADERS,
    },
  );

  const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);

  const { isLoading: runsLoading, data: pipelines } = usePromise(
    async (list: Pipeline[] | undefined) => {
      if (!list) {
        return [];
      }

      const promises = list.map((pipeline) =>
        fetch(`${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${pipeline.id}/runs`, {
          headers: CODEUP_HEADERS,
        }).then((response) => response.json() as Promise<Run[]>),
      );

      const runsData = await Promise.all(promises);
      return list.map(
        (basicInfo, index) =>
          ({
            ...basicInfo,
            runs: runsData[index],
          }) as PipelineWithRuns,
      );
    },
    [pipelineList],
  );

  const organizedPipelines = organizePipelinesByGroup(pipelines, pipelineGroups);

  return (
    <List isLoading={runsLoading || listLoading || groupLoading}>
      {organizedPipelines.map(([groupId, groupName, pipelinesInGroup]) => {
        const Section = groupId === 0 ? Fragment : List.Section;

        return (
          <Section key={groupId} {...(groupName ? { title: groupName } : {})}>
            {pipelinesInGroup.map((item) => {
              const { icon, color } = STATUS_TO_COLOR_MAP[item.runs[0]?.status as Status] || { icon: "", color: "" };

              return (
                <List.Item
                  key={item.id}
                  icon={{
                    source: icon,
                    tintColor: color,
                  }}
                  title={`${item.name}`}
                  subtitle={
                    item.runs[0]
                      ? `#${item.runs[0].pipelineRunId} · ${(showAbsoluteTime ? formatDate : formatRelativeTime)(item.runs[0].endTime)}`
                      : "No runs"
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="Show Runs"
                        target={
                          <List isShowingDetail>
                            {item.runs && item.runs.length > 0 ? (
                              groupRunsByDate(item.runs).map(([dateString, runsInGroup]) => (
                                <List.Section key={dateString} title={dateString}>
                                  {runsInGroup.map((run) => {
                                    const { icon, color } = STATUS_TO_COLOR_MAP[run.status as Status];
                                    const duration = formatDuration(run.endTime - run.startTime);
                                    const target = `https://flow.aliyun.com/pipelines/${item.id}/builds/${run.pipelineRunId}`;

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
                        }
                      />
                      <Action.OpenInBrowser url={`https://flow.aliyun.com/pipelines/${item.id}/current`} />
                      <Action
                        title="Show Absolute Time"
                        shortcut={{ modifiers: ["shift"], key: "a" }}
                        onAction={() => {
                          setShowAbsoluteTime((prev) => !prev);
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </Section>
        );
      })}
    </List>
  );
}

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

function organizePipelinesByGroup(
  pipelines: PipelineWithRuns[] | undefined,
  groups: PipelineGroup[] | undefined,
): [number, string, PipelineWithRuns[]][] {
  if (!pipelines || pipelines.length === 0) {
    return [];
  }

  const pipelineGroups = new Map<number, PipelineWithRuns[]>();

  pipelines
    .sort((a, b) => (b.runs[0].endTime || b.runs[0].startTime) - (a.runs[0].endTime || a.runs[0].startTime))
    .forEach((pipeline) => {
      const groupId = pipeline.groupId || 0;
      if (!pipelineGroups.has(groupId)) {
        pipelineGroups.set(groupId, []);
      }
      pipelineGroups.get(groupId)!.push(pipeline);
    });

  const result: [number, string, PipelineWithRuns[]][] = [];

  if (pipelineGroups.has(0)) {
    result.push([0, "", pipelineGroups.get(0)!]);
  }

  pipelineGroups.forEach((pipelines, groupId) => {
    if (groupId !== 0) {
      const groupName = groups?.find((g) => g.id === groupId)?.name || `Group ${groupId}`;
      result.push([groupId, groupName, pipelines]);
    }
  });

  return result;
}
