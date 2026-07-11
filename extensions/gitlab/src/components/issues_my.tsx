/**
 * This file defines components and hooks for displaying and managing the user's GitLab issues in Raycast.
 * - MyIssues: Top-level component for filtering issues by project, scope, and state.
 * - MyIssueList: Renders the list of issues.
 * - useMyIssues: Custom hook to fetch issues with caching and refetch logic.
 *
 * The code ensures efficient rendering and avoids render loops by using stable dependencies in hooks.
 */

import { List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../common";
import { Issue, Project } from "../gitlabapi";
import { getErrorMessage } from "../utils";
import { IssueListEmptyView, IssueListItem, IssueScope, IssueState } from "./issues";
import { MyProjectsDropdown } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any */

function MyIssueList(props: {
  issues: Issue[];
  isLoading: boolean;
  title?: string;
  performRefetch: () => void;
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}) {
  return (
    <List
      searchBarPlaceholder="Search issues by name..."
      isLoading={props.isLoading}
      searchBarAccessory={props.searchBarAccessory}
      throttle
    >
      <List.Section title={props.title} subtitle={props.issues.length.toString()}>
        {props.issues.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} refreshData={props.performRefetch} />
        ))}
      </List.Section>
      <IssueListEmptyView />
    </List>
  );
}

export function MyIssues(props: { scope: IssueScope; state: IssueState }) {
  const [project, setProject] = useState<Project>();
  const { issues: raw, isLoading, performRefetch } = useMyIssues(props.scope, props.state);
  return (
    <MyIssueList
      isLoading={isLoading}
      issues={project ? raw.filter((issue) => issue.project_id === project.id) : raw}
      title={props.scope == IssueScope.assigned_to_me ? "Your Assigned Issues" : "Your Recently Created Issues"}
      performRefetch={performRefetch}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}

export function useMyIssues(
  scope: IssueScope,
  state: IssueState,
  params?: Record<string, any>,
): {
  issues: Issue[];
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
} {
  const {
    data: issues,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (scope: IssueScope, state: IssueState, params: Record<string, any> | undefined): Promise<Issue[]> => {
      const apiParams = { state, scope, ...(params || {}) };
      return gitlab.getIssues(apiParams, undefined, scope === IssueScope.assigned_to_me && state === IssueState.opened);
    },
    [scope, state, params],
    { initialData: [] },
  );
  return { issues, isLoading, error: error ? getErrorMessage(error) : undefined, performRefetch: revalidate };
}
