import { List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Issue, Project } from "../gitlabapi";
import { daysInSeconds, showErrorToast } from "../utils";
import { IssueListItem, IssueScope, IssueState } from "./issues";
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
}): JSX.Element {
  const issues = props.issues;

  const refresh = () => {
    props.performRefetch();
  };

  return (
    <List
      searchBarPlaceholder="Search issues by name..."
      isLoading={props.isLoading}
      searchBarAccessory={props.searchBarAccessory}
    >
      <List.Section title={props.title} subtitle={issues?.length.toString() || ""}>
        {issues?.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} refreshData={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

export function MyIssues(props: { scope: IssueScope; state: IssueState }): JSX.Element {
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

function useMyIssues(
  scope: IssueScope,
  state: IssueState,
  project: Project | undefined
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
    `myissues_${scope}_${state}`,
    async (): Promise<Issue[] | undefined> => {
      return await gitlab.getIssues(
        { state, scope },
        undefined,
        scope === IssueScope.assigned_to_me && state === IssueState.opened ? true : false
      );
    },
    {
      deps: [project, scope, state],
      secondsToRefetch: 10,
      secondsToInvalid: daysInSeconds(7),
    }
  );
  return { issues, isLoading, error, performRefetch };
}
