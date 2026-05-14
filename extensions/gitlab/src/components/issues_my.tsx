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
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Issue, Project } from "../gitlabapi";
import { daysInSeconds, showErrorToast } from "../utils";
import { IssueListEmptyView, IssueListItem, IssueScope, IssueState } from "./issues";
import { MyProjectsDropdown } from "./project";

/* eslint-disable @typescript-eslint/no-explicit-any */

function MyIssueList(props: {
  issues: Issue[] | undefined;
  isLoading: boolean;
  title?: string;
  performRefetch: () => void;
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}) {
  const issues = props.issues;

  const refresh = () => {
    props.performRefetch();
  };

  return (
    <List
      searchBarPlaceholder="Search issues by name..."
      isLoading={props.isLoading}
      searchBarAccessory={props.searchBarAccessory}
      throttle
    >
      <List.Section title={props.title} subtitle={issues?.length.toString() || ""}>
        {issues?.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} refreshData={refresh} />
        ))}
      </List.Section>
      <IssueListEmptyView />
    </List>
  );
}

export function MyIssues(props: { scope: IssueScope; state: IssueState }) {
  const scope = props.scope;
  const state = props.state;
  const [project, setProject] = useState<Project>();
  const { issues: raw, isLoading, error, performRefetch } = useMyIssues(scope, state, project);
  if (error) {
    showErrorToast(error, "Cannot load Issues");
  }
  const issues: Issue[] | undefined = project ? raw?.filter((i) => i.project_id === project.id) : raw;
  const title = scope == IssueScope.assigned_to_me ? "Your Assigned Issues" : "Your Recently Created Issues";
  return (
    <MyIssueList
      isLoading={isLoading}
      issues={issues}
      title={title}
      performRefetch={performRefetch}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}

export function useMyIssues(
  scope: IssueScope,
  state: IssueState,
  project: Project | undefined,
  params?: Record<string, any>,
): {
  issues: Issue[] | undefined;
  isLoading: boolean;
  error: string | undefined;
  performRefetch: () => void;
} {
  const {
    data: issues,
    isLoading,
    error,
    performRefetch,
  } = useCache<Issue[] | undefined>(
    `myissues_${scope}_${state}_${params ? JSON.stringify(params) : ""}`,
    async (): Promise<Issue[] | undefined> => {
      // Merge state/scope with any additional params
      const apiParams = { state, scope, ...(params || {}) };
      return await gitlab.getIssues(
        apiParams,
        undefined,
        scope === IssueScope.assigned_to_me && state === IssueState.opened ? true : false,
      );
    },
    {
      deps: [project?.id, scope, state, JSON.stringify(params)], // Use project?.id for stable dependency
      secondsToRefetch: 10,
      secondsToInvalid: daysInSeconds(7),
    },
  );
  return { issues, isLoading, error, performRefetch };
}
