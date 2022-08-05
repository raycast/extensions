import { useMemo } from "react";
import { formatDistance } from "date-fns";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { useProjects, useSummary } from "../hooks";
import { cumulateSummaryDuration, getDuration } from "../utils";

export const RangeStatsList: React.FC<Omit<SummaryItemProps, "title" | "range">> = (props) => {
  const { data: summary } = useSummary();

  return (
    <List.Section title="Stats Summary">
      {summary?.map(([key, { result: range }]) => (
        <RangeStatsItem key={key} title={key} range={range} {...props} />
      ))}
    </List.Section>
  );
};

const keys = ["categories", "editors", "languages", "projects"] as const;

const RangeStatsItem: React.FC<SummaryItemProps> = ({ range, setShowDetail, showDetail, title }) => {
  // Item should have details if cummulative seconds is not 0 or null/undefined
  const haveDetails = !!range.cummulative_total?.seconds;

  const md = useMemo(() => {
    if (!haveDetails) return [];

    return [
      `## ${title}`,
      getDuration(range.cummulative_total?.seconds),
      "---",
      ...keys.flatMap((key) => [
        `### ${key[0].toUpperCase()}${key.slice(1)}`,
        ...cumulateSummaryDuration(range, key).map(([name, seconds]) => `- ${name} (**${getDuration(seconds)}**)`),
      ]),
    ];
  }, [range, title]);

  const props: Partial<List.Item.Props> =
    showDetail && haveDetails
      ? { detail: <List.Item.Detail markdown={md.join("\n\n")} /> }
      : {
          accessories: [
            {
              tooltip: "Cumulative Total",
              text: getDuration(range.cummulative_total?.seconds),
            },
          ],
        };

  return (
    <List.Item
      {...props}
      title={title}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Sidebar}
            onAction={() => setShowDetail(!showDetail)}
            title={showDetail ? "Hide Details" : "Show Details"}
          />
        </ActionPanel>
      }
    />
  );
};

export const ProjectsStatsList: React.FC = () => {
  const projects = useProjects();
  if (projects.isLoading !== false) return null;

  return (
    <List.Section title="Projects">
      {projects.data?.data
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            actions={
              <ActionPanel>
                {project.has_public_url && (
                  <Action.OpenInBrowser title="Open in Browser" url={`https://wakatime.com${project.url}`} />
                )}
              </ActionPanel>
            }
            accessories={[
              {
                tooltip: "Last heartbeat",
                text: formatDistance(new Date(project.last_heartbeat_at), new Date(), { addSuffix: true }),
              },
            ]}
          />
        ))}
    </List.Section>
  );
};

interface SummaryItemProps {
  title: string;
  range: WakaTime.Summary;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
}
