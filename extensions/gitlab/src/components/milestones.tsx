import { gql } from "@apollo/client";
import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlabgql } from "../common";
import { Group, Project } from "../gitlabapi";
import { getIdFromGqlId } from "../utils";

const GET_MILESTONES = gql`
  query GetProjectMilestones($fullPath: ID!) {
    project(fullPath: $fullPath) {
      milestones {
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

export function MilestoneListItem(props: { milestone: any }) {
  const milestone = props.milestone;
  const issueCounter = `${milestone.closedIssuesCount}/${milestone.totalIssuesCount}`;
  let subtitle = "";
  if (milestone.dueDate) {
    subtitle = milestone.dueDate + (milestone.expired ? " [expired]" : "");
  }
  return (
    <List.Item
      id={milestone.id}
      title={milestone.title}
      subtitle={subtitle}
      accessoryTitle={issueCounter}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={milestone.webUrl} />
        </ActionPanel>
      }
    />
  );
}

export function MilestoneList(props: { project?: Project; group?: Group }) {
  const isGroup = props.group ? true : false;
  let fullPath = props.project ? props.project.fullPath : "";
  if (fullPath.length <= 0) {
    fullPath = props.group ? props.group.full_path : "";
  }
  const { milestones, error, isLoading } = useSearch("", fullPath, isGroup);
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Milestones", error);
  }
  return (
    <List isLoading={isLoading} navigationTitle="Milestones">
      {milestones?.map((milestone) => (
        <MilestoneListItem key={milestone.id} milestone={milestone} />
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  projectFullPath: string,
  isGroup: boolean
): {
  milestones: any[];
  error?: string;
  isLoading: boolean;
} {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        const data = await gitlabgql.client.query({ query: query, variables: { fullPath: projectFullPath } });
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
          state: p.state,
          expired: p.expired,
          webUrl: `${gitlabgql.url}/${p.webPath}`,
          closedIssuesCount: p.stats.closedIssuesCount,
          totalIssuesCount: p.stats.totalIssuesCount,
        }));
        if (!didUnmount) {
          setMilestones(glData);
        }
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
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
