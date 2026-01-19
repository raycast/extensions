import { gql } from "@apollo/client";
import { ActionPanel, Color, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGitLabGQL } from "../common";
import { Group, Project } from "../gitlabapi";
import { getErrorMessage, getIdFromGqlId, showErrorToast } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

function getColorByRatio(ratio: number): Color {
  const colors = [Color.Red, Color.Orange, Color.Yellow, Color.Blue, Color.Green];
  const colorIndex = Math.floor(ratio * (colors.length - 1));
  return colors[colorIndex];
}

export function MilestoneListItem(props: { milestone: any }) {
  const milestone = props.milestone;
  const issueCounter = `${milestone.closedIssuesCount}/${milestone.totalIssuesCount}`;
  const issueRatio =
    milestone.totalIssuesCount && milestone.totalIssuesCount > 0
      ? milestone.closedIssuesCount / milestone.totalIssuesCount
      : 0.0;
  const issuePercent = `${(issueRatio * 100).toFixed(0)}%`;
  let subtitle = "";
  if (milestone.dueDateTime) {
    subtitle = milestone.dueDate;
    if (milestone.expired && milestone.state !== "closed") {
      subtitle += ` ⚠️ ${milestone.expired ? " [expired]" : ""}`;
    }
  }
  const ratioColor = getColorByRatio(issueRatio);
  return (
    <List.Item
      id={milestone.id}
      title={milestone.title}
      subtitle={subtitle}
      accessories={[{ text: issueCounter }, { tag: { value: issuePercent, color: ratioColor } }]}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={milestone.webUrl} />
        </ActionPanel>
      }
    />
  );
}

export function MilestoneList(props: { project?: Project; group?: Group; navigationTitle?: string }) {
  const isGroup = !!props.group;
  let fullPath = props.project ? props.project.fullPath : "";
  if (fullPath.length <= 0) {
    fullPath = props.group ? props.group.full_path : "";
  }
  const { milestones, error, isLoading } = useSearch("", fullPath, isGroup);
  if (error) {
    showErrorToast(error, "Cannot search Milestones");
  }
  const closeMilestones = milestones.filter((m) => m.state === "closed");
  const openMilestones = milestones
    .filter((m) => m.state !== "closed")
    .sort((a, b) => (a.dueDateTime || 0) - (b.dueDateTime || 0));

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
  query: string | undefined,
  projectFullPath: string,
  isGroup: boolean,
): {
  milestones: any[];
  error?: string;
  isLoading: boolean;
} {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const query = isGroup ? GET_GROUP_MILESTONES : GET_MILESTONES;
        const data = await getGitLabGQL().client.query({ query: query, variables: { fullPath: projectFullPath } });
        let milestoneRoot;
        if (isGroup) {
          milestoneRoot = data.data.group;
        } else {
          milestoneRoot = data.data.project;
        }
        const glData: Record<string, any>[] = milestoneRoot.milestones.nodes.map((p: any) => ({
          id: getIdFromGqlId(p.id),
          title: p.title,
          dueDate: p.dueDate,
          dueDateTime: p.dueDate ? new Date(p.dueDate).getTime() : undefined,
          state: p.state,
          expired: p.expired,
          webUrl: `${getGitLabGQL().url}/${p.webPath}`,
          closedIssuesCount: p.stats.closedIssuesCount,
          totalIssuesCount: p.stats.totalIssuesCount,
        }));
        if (!didUnmount) {
          setMilestones(glData);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, projectFullPath]);

  return { milestones, error, isLoading };
}
