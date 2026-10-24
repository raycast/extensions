import { gql } from "@apollo/client";
import { ActionPanel, Color, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { getGitLabGQL } from "../common";
import { Group, Project } from "../gitlabapi";
import { getIdFromGqlId } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";

const GET_MILESTONES = gql`
  query GetProjectMilestones($fullPath: ID!) {
    project(fullPath: $fullPath) {
      milestones(sort: DUE_DATE_DESC) {
        nodes {
          id
          title
          dueDate
          state
          expired
          webPath
          stats {
            closedIssuesCount
            totalIssuesCount
          }
        }
      }
    }
  }
`;

const GET_GROUP_MILESTONES = gql`
  query GetGroupMilestones($fullPath: ID!) {
    group(fullPath: $fullPath) {
      milestones(includeDescendants: true) {
        nodes {
          id
          title
          dueDate
          state
          expired
          webPath
          stats {
            closedIssuesCount
            totalIssuesCount
          }
        }
      }
    }
  }
`;

interface MilestoneListEntry {
  id: number;
  title: string;
  dueDate?: string;
  dueDateTime?: number;
  state: string;
  expired?: boolean;
  webUrl: string;
  closedIssuesCount: number;
  totalIssuesCount: number;
}

interface GqlMilestoneNode {
  id: string;
  title: string;
  dueDate?: string;
  state: string;
  expired?: boolean;
  webPath: string;
  stats: { closedIssuesCount: number; totalIssuesCount: number };
}

export function MilestoneListItem(props: { milestone: MilestoneListEntry }) {
  const issueRatio =
    props.milestone.totalIssuesCount && props.milestone.totalIssuesCount > 0
      ? props.milestone.closedIssuesCount / props.milestone.totalIssuesCount
      : 0.0;
  let subtitle = "";
  if (props.milestone.dueDateTime) {
    subtitle = props.milestone.dueDate ?? "";
    if (props.milestone.expired && props.milestone.state !== "closed") {
      subtitle += ` ⚠️ ${props.milestone.expired ? " [expired]" : ""}`;
    }
  }
  return (
    <List.Item
      id={`${props.milestone.id}`}
      title={props.milestone.title}
      subtitle={subtitle}
      accessories={[
        { text: `${props.milestone.closedIssuesCount}/${props.milestone.totalIssuesCount}` },
        {
          tag: {
            value: `${(issueRatio * 100).toFixed(0)}%`,
            color: [Color.Red, Color.Orange, Color.Yellow, Color.Blue, Color.Green][Math.floor(issueRatio * 4)],
          },
        },
      ]}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={props.milestone.webUrl} />
        </ActionPanel>
      }
    />
  );
}

export function MilestoneList(props: { project?: Project; group?: Group; navigationTitle?: string }) {
  const { milestones, isLoading } = useSearch(
    props.project?.fullPath && props.project.fullPath.length > 0
      ? props.project.fullPath
      : (props.group?.full_path ?? ""),
    !!props.group,
  );
  const { closeMilestones, openMilestones } = useMemo(() => {
    const closed = milestones.filter((milestone) => milestone.state === "closed");
    const open = milestones
      .filter((milestone) => milestone.state !== "closed")
      .sort(
        (firstMilestone, secondMilestone) => (firstMilestone.dueDateTime || 0) - (secondMilestone.dueDateTime || 0),
      );
    return { closeMilestones: closed, openMilestones: open };
  }, [milestones]);

  return (
    <List isLoading={isLoading} navigationTitle={props.navigationTitle || "Milestones"}>
      <List.Section title="Open">
        {openMilestones?.map((milestone) => (
          <MilestoneListItem key={milestone.id} milestone={milestone} />
        ))}
      </List.Section>
      <List.Section title="Closed">
        {closeMilestones?.map((milestone) => (
          <MilestoneListItem key={milestone.id} milestone={milestone} />
        ))}
      </List.Section>
    </List>
  );
}

export function useSearch(
  projectFullPath: string,
  isGroup: boolean,
): {
  milestones: MilestoneListEntry[];
  isLoading: boolean;
} {
  const { data, isLoading } = usePromise(
    async (fullPath: string, group: boolean): Promise<MilestoneListEntry[]> => {
      const data = await getGitLabGQL().client.query({
        query: group ? GET_GROUP_MILESTONES : GET_MILESTONES,
        variables: { fullPath },
      });
      return (group ? data.data.group : data.data.project).milestones.nodes.map(
        (node: GqlMilestoneNode): MilestoneListEntry => ({
          id: getIdFromGqlId(node.id),
          title: node.title,
          dueDate: node.dueDate,
          dueDateTime: node.dueDate ? new Date(node.dueDate).getTime() : undefined,
          state: node.state,
          expired: node.expired,
          webUrl: `${getGitLabGQL().url}/${node.webPath}`,
          closedIssuesCount: node.stats.closedIssuesCount,
          totalIssuesCount: node.stats.totalIssuesCount,
        }),
      );
    },
    [projectFullPath, isGroup],
  );
  return { milestones: data ?? [], isLoading };
}
