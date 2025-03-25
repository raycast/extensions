import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import { Pipeline, PipelineGroup, Run, Status } from "./types";
import { YUNXIAO_HEADERS, DOMAIN, ORGANIZATION_ID, STATUS_TO_COLOR_MAP } from "./constants";
import { RunsList } from "./components";
import { formatDate, formatRelativeTime } from "./utils";
import { Fragment } from "react/jsx-runtime";
import { useState } from "react";

export type PipelineWithRuns = Pipeline & { runs: Run[] };

export default function Command() {
  const { data: pipelineList, isLoading: listLoading } = useFetch<Pipeline[]>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines`,
    {
      headers: YUNXIAO_HEADERS,
    },
  );

  const { data: pipelineGroups, isLoading: groupLoading } = useFetch<PipelineGroup[]>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelineGroups`,
    {
      headers: YUNXIAO_HEADERS,
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
          headers: YUNXIAO_HEADERS,
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
            {pipelinesInGroup.map((pipeline) => {
              const { icon, color } = STATUS_TO_COLOR_MAP[pipeline.runs[0]?.status as Status] || {
                icon: "",
                color: "",
              };

              return (
                <List.Item
                  key={pipeline.id}
                  icon={{
                    source: icon,
                    tintColor: color,
                  }}
                  title={`${pipeline.name}`}
                  subtitle={
                    pipeline.runs[0]
                      ? `#${pipeline.runs[0].pipelineRunId} · ${(showAbsoluteTime ? formatDate : formatRelativeTime)(pipeline.runs[0].endTime)}`
                      : "No runs"
                  }
                  actions={
                    <ActionPanel>
                      <Action.Push title="Show Runs" icon={Icon.List} target={<RunsList pipeline={pipeline} />} />
                      <Action.OpenInBrowser url={`https://flow.aliyun.com/pipelines/${pipeline.id}/current`} />
                      <Action
                        title={showAbsoluteTime ? "Show Relative Time" : "Show Absolute Time"}
                        icon={showAbsoluteTime ? Icon.Clock : Icon.Clock}
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
