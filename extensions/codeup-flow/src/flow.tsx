import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import { Pipeline, Run, Status } from "./types";
import { CODEUP_HEADERS, DOMAIN, ORGANIZATION_ID, STATUS_TO_COLOR_MAP } from "./constants";
import { RunDetail } from "./components";
import { formatDate, formatDuration, formatTime, getDateString } from "./utils";

export default function Command() {
  const { data: pipelineList, isLoading: listLoading } = useFetch<Pipeline[]>(
    `${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines`,
    {
      headers: CODEUP_HEADERS,
    },
  );

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
      return list.map((basicInfo, index) => ({
        ...basicInfo,
        runs: runsData[index],
      }));
    },
    [pipelineList],
  );

  return (
    <List isLoading={runsLoading || listLoading}>
      {pipelines?.map((item) => {
        const { icon, color } = STATUS_TO_COLOR_MAP[item.runs[0].status as Status];

        return (
          <List.Item
            key={item.id}
            icon={{
              source: icon,
              tintColor: color,
            }}
            title={`${item.name}`}
            subtitle={`#${item.runs[0].pipelineRunId} -> ${formatDate(item.runs[0].endTime)}`}
            actions={
              <ActionPanel>
                {/* <Action.Push title="Show Details" target={<Detail markdown={`# ${item.name}`} />} /> */}
                <Action.Push
                  title="Show Runs"
                  target={
                    <List isShowingDetail>
                      {groupRunsByDate(item.runs).map(([dateString, runsInGroup]) => (
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
                      ))}
                    </List>
                  }
                />
                <Action.OpenInBrowser url={`https://flow.aliyun.com/pipelines/${item.id}/current`} />
              </ActionPanel>
            }
          />
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
