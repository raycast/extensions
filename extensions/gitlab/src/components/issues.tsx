import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  Color,
  showToast,
  ToastStyle,
  Detail,
  PushAction,
  ImageMask,
} from "@raycast/api";
import { gql } from "@apollo/client";
import { useEffect, useState } from "react";
import { gitlab, gitlabgql } from "../common";
import { Group, Issue, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { optimizeMarkdownText, toDateString } from "../utils";
import { IssueItemActions } from "./issue_actions";

export enum IssueScope {
  created_by_me = "created_by_me",
  assigned_to_me = "assigned_to_me",
  all = "all",
}

export enum IssueState {
  all = "all",
  opened = "opened",
  closed = "closed",
}

const GET_ISSUE_DETAIL = gql`
  query GetIssueDetail($id: ID!) {
    issue(id: $id) {
      description
    }
  }
`;

export function IssueDetail(props: { issue: Issue }) {
  const { description, error, isLoading } = useDetail(props.issue.id);
  if (error) {
    showToast(ToastStyle.Failure, "Could not get issue details", error);
  }

  return (
    <Detail
      markdown={optimizeMarkdownText(description)}
      isLoading={isLoading}
      navigationTitle={`${props.issue.reference_full}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={props.issue.web_url} />
          <IssueItemActions issue={props.issue} />
        </ActionPanel>
      }
    />
  );
}

export function useDetail(issueID: number): {
  description: string;
  error?: string;
  isLoading: boolean;
} {
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (issueID <= 0 || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const data = await gitlabgql.client.query({
          query: GET_ISSUE_DETAIL,
          variables: { id: `gid://gitlab/Issue/${issueID}` },
        });
        const desc = data.data.issue.description || "<no description>";
        if (!cancel) {
          setDescription(desc);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [issueID]);

  return { description, error, isLoading };
}

export function IssueListItem(props: { issue: Issue }) {
  const issue = props.issue;
  const tintColor = issue.state === "opened" ? Color.Green : Color.Red;
  const extraSubtitle = issue.milestone ? `${issue.milestone.title}  |  ` : "";
  return (
    <List.Item
      id={issue.id.toString()}
      title={issue.title}
      subtitle={"#" + issue.iid}
      icon={{ source: GitLabIcons.issue, tintColor: tintColor }}
      accessoryIcon={{ source: issue.author?.avatar_url || "", mask: ImageMask.Circle }}
      accessoryTitle={extraSubtitle + toDateString(issue.updated_at)}
      actions={
        <ActionPanel>
          <PushAction
            title="Show Details"
            target={<IssueDetail issue={issue} />}
            icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
          />
          <OpenInBrowserAction url={issue.web_url} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
          <IssueItemActions issue={issue} />
        </ActionPanel>
      }
    />
  );
}

interface IssueListProps {
  scope: IssueScope;
  state?: IssueState;
  project?: Project;
  group?: Group;
}

function navTitle(project?: Project, group?: Group): string | undefined {
  if (group) {
    return `Group Issues ${group.full_path}`;
  }
  if (project) {
    return `Issue ${project.fullPath}`;
  }
  return undefined;
}

export function IssueList({
  scope = IssueScope.created_by_me,
  state = IssueState.all,
  project = undefined,
  group = undefined,
}: IssueListProps) {
  const [searchText, setSearchText] = useState<string>();
  const { issues, error, isLoading } = useSearch(searchText, scope, state, project, group);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search issue", error);
  }

  if (!issues) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const title = scope == IssueScope.assigned_to_me ? "Your Issues" : "Created Recently";

  return (
    <List
      searchBarPlaceholder="Search issues by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={navTitle(project, group)}
    >
      <List.Section title={title} subtitle={issues?.length.toString() || ""}>
        {issues?.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} />
        ))}
      </List.Section>
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  scope: IssueScope,
  state: IssueState,
  project?: Project,
  group?: Group
): {
  issues?: Issue[];
  error?: string;
  isLoading: boolean;
} {
  const [issues, setIssues] = useState<Issue[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (group) {
          const glIssues = await gitlab.getGroupIssues(
            {
              state: state,
              scope: scope,
              search: query || "",
              in: "title",
            },
            group.id
          );
          if (!cancel) {
            setIssues(glIssues);
          }
        } else {
          const glIssues = await gitlab.getIssues(
            {
              state: state,
              scope: scope,
              search: query || "",
              in: "title",
            },
            project
          );
          if (!cancel) {
            setIssues(glIssues);
          }
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query]);

  return { issues, error, isLoading };
}
