import { useMemo } from "react";
import { compareDesc, formatDistance } from "date-fns";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";

import { useActivityChange, useProjects, useSummary } from "../hooks";
import { cumulateSummaryDuration, getDuration } from "../utils";

export const RangeStatsList: React.FC<ShowDetailProps> = (props) => {
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
  const md = useMemo(() => {
    return [
      `## ${title}`,
      getDuration(range.cummulative_total.seconds),
      "---",
      ...keys.flatMap((key) => [
        `### ${key[0].toUpperCase()}${key.slice(1)}`,
        ...cumulateSummaryDuration(range, key).map(([name, seconds]) => `- ${name} (**${getDuration(seconds)}**)`),
      ]),
    ];
  }, [range, title]);

  const props: Partial<List.Item.Props> = showDetail
    ? { detail: <List.Item.Detail markdown={md.join("\n\n")} /> }
    : {
        accessories: [
          {
            tooltip: "Cumulative Total",
            text: getDuration(range.cummulative_total.seconds),
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
  const { data: { data: projects } = {}, isLoading } = useProjects();

  if (isLoading) return null;

  return (
    <List.Section title="Projects">
      {projects
        ?.sort((a, b) => compareDesc(new Date(a.last_heartbeat_at), new Date(b.last_heartbeat_at)))
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

export const ActivityChange: React.FC<ShowDetailProps> = ({ showDetail, setShowDetail }) => {
  const { data: activityChange, isLoading, error } = useActivityChange();

  const md = useMemo(() => {
    if (!activityChange) return [];
    const { overall, languages } = activityChange;

    return [
      `## You've done ${overall.quantifier} than you did yesterday!`,
      `### A ${overall.duration} ${overall.quantifier === "more" ? "increase" : "decrease"}${
        overall.percent ? ` and ${overall.percent} change` : ""
      }!!`,
      `#### Languages`,
      ...languages.map(
        ([language, stat]) =>
          `- ${language} - ${stat.duration} ${stat.percent ? `(${stat.percent} ${stat.quantifier})` : stat.quantifier}`
      ),
    ];
  }, [activityChange]);

  if (error) {
    showToast(Toast.Style.Failure, "Error in Activity", error.message);
    return null;
  }

  if (isLoading) return <List.Item title="Loading Activity Changes" icon={Icon.Heartbeat} />;

  return (
    <List.Item
      detail={<List.Item.Detail markdown={md.join("\n\n")} />}
      title={activityChange?.title ?? "Activity Change"}
      accessories={showDetail ? null : activityChange?.accessories}
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

interface SummaryItemProps extends ShowDetailProps {
  title: string;
  range: WakaTime.Summary;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ShowDetailProps {
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
}
