import { Detail } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";

import {
  IssueDetailFieldsFragment,
  IssueFieldsFragment,
  SearchCreatedIssuesQuery,
  SearchOpenIssuesQuery,
  UserFieldsFragment,
} from "../generated/graphql";
import { pluralize } from "../helpers";
import { getIssueAuthor, getIssueStatus } from "../helpers/issue";
import { getGitHubUser } from "../helpers/users";
import { getGitHubClient } from "../helpers/withGithubClient";
import { useViewer } from "../hooks/useViewer";

import IssueActions from "./IssueActions";

type PullRequestDetailProps = {
  initialIssue: IssueFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList?:
    | MutatePromise<SearchCreatedIssuesQuery | undefined>
    | MutatePromise<SearchOpenIssuesQuery | undefined>
    | MutatePromise<IssueFieldsFragment[] | undefined>;
};

export default function IssueDetail({ initialIssue, mutateList }: PullRequestDetailProps) {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const {
    data: issue,
    isLoading,
    mutate: mutateDetail,
  } = useCachedPromise(
    async (issueId) => {
      const issueDetails = await github.issueDetails({ nodeId: issueId });
      return issueDetails.node as IssueDetailFieldsFragment;
    },
    [initialIssue.id],
    { initialData: initialIssue }
  );

  let markdown = `# ${issue.title}`;
  if (issue?.body) {
    markdown += `\n\n${issue.body}`;
  }

  const status = getIssueStatus(issue);
  const author = getIssueAuthor(issue);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`#${issue.number}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Repository" text={issue.repository.nameWithOwner} />

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item {...status} />
          </Detail.Metadata.TagList>

          {issue.updatedAt ? (
            <Detail.Metadata.Label title="Updated" text={format(new Date(issue.updatedAt), "dd MMM")} />
          ) : null}

          <Detail.Metadata.Label title="Author" {...author} />

          {issue.assignees && issue.assignees.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(issue.assignees.totalCount, "Assignee")}>
              {issue.assignees.nodes?.map((assignee) => {
                if (!assignee) {
                  return null;
                }
                const user = getGitHubUser(assignee);

                return <Detail.Metadata.TagList.Item key={assignee.id} {...user} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {issue.labels && issue.labels.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(issue.labels.totalCount, "Label")}>
              {issue.labels.nodes?.map((label) => {
                if (!label) {
                  return null;
                }

                return <Detail.Metadata.TagList.Item key={label.id} text={label.name} color={label.color} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {issue.projectsV2 && issue.projectsV2.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(issue.projectsV2.totalCount, "Project")}>
              {issue.projectsV2.nodes?.map((project) => {
                if (!project) {
                  return null;
                }

                return <Detail.Metadata.TagList.Item key={project.id} text={project.title} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {issue.milestone ? <Detail.Metadata.Label title="Milestone" text={issue.milestone.title} /> : null}
        </Detail.Metadata>
      }
      actions={<IssueActions issue={issue} viewer={viewer} mutateList={mutateList} mutateDetail={mutateDetail} />}
    />
  );
}
