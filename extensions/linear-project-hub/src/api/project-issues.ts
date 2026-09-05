import { getLinearClient } from "./linear-client";
import type { ProjectStatusType, ProjectUser } from "./projects";

export type IssueStateType = "backlog" | "unstarted" | "started" | "completed" | "canceled" | "triage";

export type IssueAttachment = {
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  sourceType: string | null;
};

export type ProjectIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  priority: number;
  branchName: string | null;
  state: { id: string; name: string; type: IssueStateType; color: string };
  assignee: ProjectUser | null;
  attachments: { nodes: IssueAttachment[] };
};

export type ConnectedPullRequest = {
  id: string;
  title: string;
  url: string;
  issueIdentifier: string;
};

const OPEN_ISSUE_STATE_TYPES: IssueStateType[] = ["backlog", "unstarted", "started", "triage"];

const PULL_REQUEST_URL_PATTERN = /github\.com\/[^/]+\/[^/]+\/pull\/\d+/i;

export async function getProjectIssues(projectId: string): Promise<ProjectIssue[]> {
  const { graphQLClient } = getLinearClient();

  const { data } = await graphQLClient.rawRequest<
    { project: { issues: { nodes: ProjectIssue[] } } },
    { projectId: string }
  >(
    `
      query ProjectIssues($projectId: String!) {
        project(id: $projectId) {
          issues(first: 100) {
            nodes {
              id
              identifier
              title
              url
              priority
              branchName
              state {
                id
                name
                type
                color
              }
              assignee {
                id
                displayName
                email
                avatarUrl
              }
              attachments(first: 20) {
                nodes {
                  id
                  title
                  subtitle
                  url
                  sourceType
                }
              }
            }
          }
        }
      }
    `,
    { projectId },
  );

  return data?.project?.issues.nodes ?? [];
}

export function isOpenIssue(issue: ProjectIssue): boolean {
  return OPEN_ISSUE_STATE_TYPES.includes(issue.state.type);
}

function isPullRequestAttachment(attachment: IssueAttachment): boolean {
  return attachment.sourceType === "github" || PULL_REQUEST_URL_PATTERN.test(attachment.url);
}

export function getConnectedPullRequests(issues: ProjectIssue[]): ConnectedPullRequest[] {
  const seen = new Set<string>();
  const pullRequests: ConnectedPullRequest[] = [];

  for (const issue of issues) {
    if (!isOpenIssue(issue)) {
      continue;
    }

    for (const attachment of issue.attachments.nodes) {
      if (!isPullRequestAttachment(attachment) || seen.has(attachment.url)) {
        continue;
      }

      seen.add(attachment.url);
      pullRequests.push({
        id: attachment.id,
        title: attachment.title || attachment.url,
        url: attachment.url,
        issueIdentifier: issue.identifier,
      });
    }
  }

  return pullRequests;
}

export type { ProjectStatusType };
