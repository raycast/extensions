import { Action, ActionPanel, List, Color, Detail, Image, Icon } from "@raycast/api";
import { gql } from "@apollo/client";
import { useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { getGitLabGQL, gitlab } from "../common";
import { Group, Issue, Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import {
  capitalizeFirstLetter,
  formatDate,
  formatDateTime,
  optimizeMarkdownText,
  Query,
  tokenizeQueryText,
} from "../utils";
import { IssueItemActions } from "./issue_actions";
import { GitLabOpenInBrowserAction } from "./actions";
import { userIcon, userTagOnAction } from "./users";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  query GetIssueDetail($id: IssueID!) {
    issue(id: $id) {
      description
      webUrl
    }
  }
`;

export function IssueListEmptyView() {
  return <List.EmptyView title="No Issues" icon={{ source: "issues.svg", tintColor: Color.PrimaryText }} />;
}

export function IssueDetailFetch(props: { project: Project; issueId: number }) {
  const { issue, isLoading } = useIssue(props.project.id, props.issueId);
  if (isLoading || !issue) {
    return <Detail isLoading={isLoading} />;
  } else {
    return <IssueDetail issue={issue} />;
  }
}

interface IssueDetailData {
  description: string;
  projectWebUrl?: string;
}

export function IssueDetail(props: { issue: Issue }) {
  const { issueDetail, isLoading } = useDetail(props.issue.id);
  const markdown = useMemo(
    () =>
      [
        `# ${props.issue.title}`,
        optimizeMarkdownText(
          (issueDetail?.description ? issueDetail.description : props.issue.description) || "",
          issueDetail?.projectWebUrl,
          props.issue.project_id,
        ),
      ].join("  \n"),
    [
      issueDetail?.description,
      issueDetail?.projectWebUrl,
      props.issue.description,
      props.issue.project_id,
      props.issue.title,
    ],
  );

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={`${props.issue.reference_full}`}
      actions={
        <ActionPanel>
          <GitLabOpenInBrowserAction url={props.issue.web_url} />
          <IssueItemActions issue={props.issue} />
          <Action.CopyToClipboard title="Copy Issue Description" content={props.issue.description} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={capitalizeFirstLetter(props.issue.state)}
              color={props.issue.state === "closed" ? "red" : "green"}
            />
          </Detail.Metadata.TagList>
          {props.issue.author && (
            <Detail.Metadata.TagList title="Author">
              <Detail.Metadata.TagList.Item
                key={props.issue.id}
                text={props.issue.author.name}
                icon={userIcon(props.issue.author)}
                onAction={userTagOnAction(props.issue.author)}
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.TagList title="Assignee">
            {props.issue.assignees.length > 0 ? (
              props.issue.assignees.map((assignee) => (
                <Detail.Metadata.TagList.Item
                  key={assignee.id}
                  text={assignee.name}
                  icon={userIcon(assignee)}
                  onAction={userTagOnAction(assignee)}
                />
              ))
            ) : (
              <Detail.Metadata.TagList.Item text="-" />
            )}
          </Detail.Metadata.TagList>
          {props.issue.created_at && (
            <Detail.Metadata.Label title="Created" text={formatDate(props.issue.created_at)} />
          )}
          {props.issue.updated_at && (
            <Detail.Metadata.Label title="Updated" text={formatDate(props.issue.updated_at)} />
          )}
          {props.issue.milestone && <Detail.Metadata.Label title="Milestone" text={props.issue.milestone.title} />}
          {props.issue.labels.length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {props.issue.labels?.map((label) => (
                <Detail.Metadata.TagList.Item key={label.id} text={label.name || "?"} color={label.color} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function useDetail(issueID: number): {
  issueDetail?: IssueDetailData;
  isLoading: boolean;
} {
  const { data, isLoading } = usePromise(
    async (issueId: number): Promise<IssueDetailData> => {
      const data = await getGitLabGQL().client.query({
        query: GET_ISSUE_DETAIL,
        variables: { id: `gid://gitlab/Issue/${issueId}` },
      });
      const webUrl = (data.data.issue.webUrl as string) || "";
      const index = webUrl.indexOf("/-/");
      return {
        description: data.data.issue.description || "<no description>",
        projectWebUrl: index > 1 ? webUrl.substring(0, index) : undefined,
      };
    },
    [issueID],
    { execute: issueID > 0 },
  );

  return { issueDetail: data, isLoading };
}

export function IssueListItem(props: { issue: Issue; refreshData: () => void }) {
  return (
    <List.Item
      id={props.issue.id.toString()}
      title={props.issue.title}
      subtitle={"#" + props.issue.iid}
      icon={{
        value: {
          source: GitLabIcons.issue,
          tintColor: props.issue.state === "opened" ? Color.Green : Color.Red,
        },
        tooltip: `Status: ${capitalizeFirstLetter(props.issue.state)}`,
      }}
      accessories={[
        {
          text: props.issue.merge_requests_count > 0 ? `${props.issue.merge_requests_count}` : undefined,
          icon:
            props.issue.merge_requests_count > 0 ? { source: "branch.png", tintColor: Color.PrimaryText } : undefined,
        },
        {
          icon: props.issue.user_notes_count && props.issue.user_notes_count > 0 ? Icon.SpeechBubble : undefined,
          text:
            props.issue.user_notes_count && props.issue.user_notes_count > 0
              ? props.issue.user_notes_count.toString()
              : undefined,
          tooltip:
            props.issue.user_notes_count && props.issue.user_notes_count > 0
              ? `Number of Comments ${props.issue.user_notes_count}`
              : undefined,
        },
        {
          tag: props.issue.milestone ? props.issue.milestone.title : "",
          tooltip: props.issue.milestone ? `Milestone: ${props.issue.milestone.title}` : undefined,
        },
        { date: new Date(props.issue.updated_at), tooltip: `Updated: ${formatDateTime(props.issue.updated_at)}` },
        {
          icon: { source: props.issue.author?.avatar_url || "", mask: Image.Mask.Circle },
          tooltip: props.issue.author ? `Author: ${props.issue.author?.name}` : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              target={<IssueDetail issue={props.issue} />}
              icon={{ source: GitLabIcons.show_details, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={props.issue.web_url} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <IssueItemActions issue={props.issue} onDataChange={props.refreshData} />
          </ActionPanel.Section>
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
  searchBarAccessory?:
    | React.ReactElement<List.Dropdown.Props, string | React.JSXElementConstructor<any>>
    | null
    | undefined;
}

export function IssueList({
  scope = IssueScope.created_by_me,
  state = IssueState.all,
  project = undefined,
  group = undefined,
}: IssueListProps) {
  const [searchText, setSearchText] = useState<string>();
  const [searchState, setSearchState] = useState<IssueState>(state);
  const { issues, isLoading, refresh } = useSearch(searchText, scope, searchState, project, group);

  return (
    <List
      searchBarPlaceholder="Search Issues by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="State"
          onChange={(newValue) => {
            for (const value of Object.values(IssueState)) {
              if (value === newValue) {
                setSearchState(IssueState[newValue]);
                refresh();
                return;
              }
            }
          }}
        >
          <List.Dropdown.Item title="Opened" value={IssueState.opened} />
          <List.Dropdown.Item title="Closed" value={IssueState.closed} />
          <List.Dropdown.Item title="All" value={IssueState.all} />
        </List.Dropdown>
      }
      navigationTitle={
        group ? `Group Issues ${group.full_path}` : project ? `${project.name_with_namespace}` : undefined
      }
    >
      <List.Section
        title={scope === IssueScope.assigned_to_me ? "Your Issues" : "Created Recently"}
        subtitle={issues?.length.toString() || ""}
      >
        {issues?.map((issue) => (
          <IssueListItem key={issue.id} issue={issue} refreshData={refresh} />
        ))}
      </List.Section>
      <IssueListEmptyView />
    </List>
  );
}

export function getIssueQuery(query: string | undefined) {
  return tokenizeQueryText(query, ["label", "author", "milestone", "assignee", "state"]);
}

function isValidIssueState(texts: string[] | undefined) {
  if (!texts) {
    return false;
  }
  for (const stateText of texts) {
    if (![IssueState.closed.valueOf(), IssueState.opened.valueOf(), IssueState.all.valueOf()].includes(stateText)) {
      return false;
    }
  }
  return true;
}

export function injectQueryNamedParameters(
  requestParams: Record<string, any>,
  query: Query,
  scope: IssueScope,
  isNegative: boolean,
) {
  const namedParams = isNegative ? query.negativeNamed : query.named;
  for (const extraParam of Object.keys(namedParams)) {
    const extraParamVal = namedParams[extraParam];
    const prefixed = (text: string): string => {
      return isNegative ? `not[${text}]` : text;
    };
    if (extraParamVal) {
      switch (extraParam) {
        case "label":
          {
            requestParams[prefixed("labels")] = extraParamVal.join(",");
          }
          break;
        case "author":
          {
            if (scope === IssueScope.all) {
              requestParams[prefixed("author_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "milestone":
          {
            requestParams[prefixed("milestone")] = extraParamVal.join(",");
          }
          break;
        case "assignee":
          {
            if (scope === IssueScope.all) {
              requestParams[prefixed("assignee_username")] = extraParamVal.join(",");
            }
          }
          break;
        case "state": {
          console.log(extraParamVal);
          if (isValidIssueState(extraParamVal)) {
            requestParams[prefixed("state")] = extraParamVal.join(",");
          }
        }
      }
    }
  }
}

export function useSearch(
  query: string | undefined,
  scope: IssueScope,
  state: IssueState,
  project?: Project,
  group?: Group,
): {
  issues?: Issue[];
  isLoading: boolean;
  refresh: () => void;
} {
  const { data, isLoading, revalidate } = usePromise(
    async (
      queryText: string,
      issueScope: IssueScope,
      issueState: IssueState,
      project?: Project,
      group?: Group,
    ): Promise<Issue[]> => {
      const parsedQuery = getIssueQuery(queryText);
      const requestParams: Record<string, any> = {
        state: issueState,
        scope: issueScope,
        search: parsedQuery.query || "",
        in: "title",
      };
      injectQueryNamedParameters(requestParams, parsedQuery, issueScope, false);
      injectQueryNamedParameters(requestParams, parsedQuery, issueScope, true);
      return group ? gitlab.getGroupIssues(requestParams, group.id) : gitlab.getIssues(requestParams, project);
    },
    [query ?? "", scope, state, project, group],
  );

  return { issues: data, isLoading, refresh: revalidate };
}

export function useIssue(
  projectID: number,
  issueID: number,
): {
  issue?: Issue;
  isLoading: boolean;
} {
  const { data, isLoading } = usePromise(
    (projectId: number, issueId: number) => gitlab.getIssue(projectId, issueId, {}),
    [projectID, issueID],
  );

  return { issue: data, isLoading };
}
