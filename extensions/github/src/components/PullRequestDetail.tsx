import { Color, Detail, Icon } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestDetailsFieldsFragment, PullRequestFieldsFragment, UserFieldsFragment } from "../generated/graphql";
import { pluralize } from "../helpers";
import { getPullRequestAuthor, getPullRequestReviewers, getPullRequestStatus } from "../helpers/pull-request";
import { getCheckStatePresentation } from "../helpers/pull-request-checks";
import { getGitHubUser } from "../helpers/users";
import { useMyPullRequests } from "../hooks/useMyPullRequests";
import { useViewer } from "../hooks/useViewer";

import PullRequestActions from "./PullRequestActions";

type PullRequestDetailProps = {
  initialPullRequest: PullRequestFieldsFragment;
  viewer?: UserFieldsFragment;
  mutateList?:
    | MutatePromise<PullRequestFieldsFragment[] | undefined>
    | MutatePromise<PullRequestFieldsFragment[]>
    | ReturnType<typeof useMyPullRequests>["mutate"];
};

export default function PullRequestDetail({ initialPullRequest, mutateList }: PullRequestDetailProps) {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const {
    data: pullRequest,
    isLoading,
    mutate: mutateDetail,
  } = useCachedPromise(
    async (pullRequestId) => {
      const pullRequestDetail = await github.pullRequestDetails({ nodeId: pullRequestId });
      return pullRequestDetail.node as PullRequestDetailsFieldsFragment;
    },
    [initialPullRequest.id],
    { initialData: initialPullRequest },
  );

  let markdown = `# ${pullRequest.title}`;
  if (pullRequest?.body) {
    markdown += `\n\n${pullRequest.body}`;
  }

  const status = getPullRequestStatus(pullRequest);
  const checks = getCheckStatePresentation(pullRequest.commits.nodes?.[0]?.commit.statusCheckRollup?.state);
  const author = getPullRequestAuthor(pullRequest);
  const reviewers = getPullRequestReviewers(pullRequest);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`#${pullRequest.number}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Repository" text={pullRequest.repository.nameWithOwner} />

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item {...status} />
            {pullRequest.autoMergeRequest && <Detail.Metadata.TagList.Item text="Auto-merge" color={Color.Yellow} />}
          </Detail.Metadata.TagList>

          {checks ? <Detail.Metadata.Label title="Checks" text={checks.text} icon={Icon[checks.icon]} /> : null}

          <Detail.Metadata.Label title="From" text={pullRequest.headRef?.name ?? pullRequest.headRefName} />

          {pullRequest.baseRef ? (
            <Detail.Metadata.Label title="Into" text={pullRequest.baseRef?.name ?? pullRequest.baseRefName} />
          ) : null}

          {pullRequest.additions && pullRequest.deletions ? (
            <Detail.Metadata.Label title="Code Changes" text={`+${pullRequest.additions}  -${pullRequest.deletions}`} />
          ) : null}

          {pullRequest.createdAt ? (
            <Detail.Metadata.Label title="Created" text={format(new Date(pullRequest.createdAt), "dd MMM")} />
          ) : null}

          <Detail.Metadata.Label title="Author" {...author} />

          {reviewers.length > 0 ? (
            <Detail.Metadata.TagList title={pluralize(reviewers.length, "Reviewer")}>
              {reviewers.map((reviewer) => {
                if (!reviewer) {
                  return null;
                }

                return <Detail.Metadata.TagList.Item key={reviewer.id} {...reviewer} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {pullRequest.assignees && pullRequest.assignees.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(pullRequest.assignees.totalCount, "Assignee")}>
              {pullRequest.assignees.nodes?.map((assignee) => {
                if (!assignee) {
                  return null;
                }
                const user = getGitHubUser(assignee);

                return <Detail.Metadata.TagList.Item key={assignee.id} {...user} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {pullRequest.labels && pullRequest.labels.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(pullRequest.labels.totalCount, "Label")}>
              {pullRequest.labels.nodes?.map((label) => {
                if (!label) {
                  return null;
                }

                return <Detail.Metadata.TagList.Item key={label.id} text={label.name} color={label.color} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {pullRequest.projectsV2 && pullRequest.projectsV2.totalCount > 0 ? (
            <Detail.Metadata.TagList title={pluralize(pullRequest.projectsV2.totalCount, "Project")}>
              {pullRequest.projectsV2.nodes?.map((project) => {
                if (!project) {
                  return null;
                }

                return <Detail.Metadata.TagList.Item key={project.id} text={project.title} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          {pullRequest.milestone ? (
            <Detail.Metadata.Label title="Milestone" text={pullRequest.milestone.title} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <PullRequestActions
          pullRequest={pullRequest}
          viewer={viewer}
          mutateList={mutateList}
          mutateDetail={mutateDetail}
        />
      }
    />
  );
}
