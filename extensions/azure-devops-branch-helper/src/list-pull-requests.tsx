import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runAz } from "./az-cli";
import PullRequestDetailsView from "./PullRequestDetailsView";
import { formatRelativeDate } from "./utils/DateUtils";
import {
  getPullRequestStatusIcon,
  getPullRequestStatusColor,
} from "./utils/IconUtils";
import { getCurrentUser } from "./azure-devops";

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface PullRequest {
  pullRequestId: number;
  title: string;
  description: string;
  status: string;
  creationDate: string;
  closedDate?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: string;
  isDraft: boolean;
  createdBy: {
    displayName: string;
    uniqueName: string;
    id: string;
  };
  reviewers: Array<{
    displayName: string;
    uniqueName: string;
    id: string;
    vote: number;
    isRequired: boolean;
  }>;
  repository: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  url?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("");

  async function fetchPullRequests() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Could not determine current Azure user");
      }
      setCurrentUser(user);

      // Check if required configuration is available
      if (!preferences.azureOrganization) {
        throw new Error(
          "Azure DevOps organization URL is required. Please configure it in preferences.",
        );
      }

      if (!preferences.azureProject) {
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences or run: az devops configure --defaults project=<ProjectName>",
        );
      }

      // Fetch ALL active PRs (not just user-related ones)
      const allActiveArgs = [
        "repos",
        "pr",
        "list",
        "--status",
        "active",
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization!,
        "--project",
        preferences.azureProject!,
        ...(preferences.azureRepository
          ? ["--repository", preferences.azureRepository]
          : []),
      ];

      const result = await runAz(allActiveArgs);
      const allPRs: PullRequest[] = JSON.parse(result.stdout);

      // Sort by creation date (newest first)
      const sortedPRs = allPRs.sort(
        (a, b) =>
          new Date(b.creationDate).getTime() -
          new Date(a.creationDate).getTime(),
      );

      setPullRequests(sortedPRs);

      if (sortedPRs.length > 0) {
        const myCount = sortedPRs.filter(
          (pr) => pr.createdBy.uniqueName === user,
        ).length;
        const otherCount = sortedPRs.length - myCount;
        await showToast(
          Toast.Style.Success,
          "Loaded!",
          `Found ${sortedPRs.length} pull requests (${myCount} mine, ${otherCount} active)`,
        );
      } else {
        await showToast(
          Toast.Style.Success,
          "No pull requests",
          "No active pull requests found",
        );
      }
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to fetch pull requests",
      );
      console.error(error);
      setPullRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  function getPullRequestUrl(pr: PullRequest): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization) return "";

    const projectName = pr.repository.project.name;
    const repoName = pr.repository.name;

    return `${preferences.azureOrganization}/${encodeURIComponent(projectName)}/_git/${encodeURIComponent(repoName)}/pullrequest/${pr.pullRequestId}`;
  }

  function getReviewStatus(pr: PullRequest, currentUserEmail: string): string {
    const isAuthor = pr.createdBy.uniqueName === currentUserEmail;

    if (isAuthor) {
      const reviewerVotes = pr.reviewers.filter((r) => r.vote !== 0);
      const approvals = reviewerVotes.filter((r) => r.vote > 0).length;
      const rejections = reviewerVotes.filter((r) => r.vote < 0).length;

      if (rejections > 0) return "Changes requested";
      if (approvals > 0) return `${approvals} approvals`;
      return "Awaiting review";
    } else {
      const myReview = pr.reviewers.find(
        (r) => r.uniqueName === currentUserEmail,
      );
      if (!myReview) return "Not a reviewer";

      if (myReview.vote > 0) return "Approved";
      if (myReview.vote < 0) return "Rejected";
      return "Review pending";
    }
  }

  function getUserRole(pr: PullRequest, currentUserEmail: string): string {
    const isAuthor = pr.createdBy.uniqueName === currentUserEmail;
    const isReviewer = pr.reviewers.some(
      (r) => r.uniqueName === currentUserEmail,
    );

    if (isAuthor && isReviewer) return "Author & Reviewer";
    if (isAuthor) return "Author";
    if (isReviewer) return "Reviewer";
    return "Unknown";
  }

  function formatBranchName(refName: string): string {
    return refName.replace("refs/heads/", "");
  }

  useEffect(() => {
    fetchPullRequests();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pull requests...">
      {!isLoading && pullRequests.length === 0 ? (
        <List.EmptyView
          icon="🔀"
          title="No Pull Requests Found"
          description="You have no active pull requests. Either you haven't created any, or they've all been completed. Time to create some new PRs or check your filters!"
          actions={
            <ActionPanel>
              <Action
                title="Refresh List"
                onAction={fetchPullRequests}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {(() => {
            // Separate user's PRs from others
            const myPRs = pullRequests.filter(
              (pr) => pr.createdBy.uniqueName === currentUser,
            );
            const otherPRs = pullRequests.filter(
              (pr) => pr.createdBy.uniqueName !== currentUser,
            );

            const renderPRItem = (pr: PullRequest) => {
              const prUrl = getPullRequestUrl(pr);
              const userRole = getUserRole(pr, currentUser);
              const reviewStatus = getReviewStatus(pr, currentUser);
              const sourceBranch = formatBranchName(pr.sourceRefName);
              const targetBranch = formatBranchName(pr.targetRefName);

              return (
                <List.Item
                  key={pr.pullRequestId}
                  icon={{
                    source: getPullRequestStatusIcon(pr.status, pr.isDraft),
                    tintColor: getPullRequestStatusColor(pr.status),
                  }}
                  title={`#${pr.pullRequestId}: ${pr.title}`}
                  subtitle={`${sourceBranch} → ${targetBranch} • ${pr.repository.name}`}
                  accessories={[
                    {
                      text: pr.isDraft ? "Draft" : pr.status,
                      tooltip: `Status: ${pr.isDraft ? "Draft" : pr.status}`,
                    },
                    {
                      text: userRole,
                      tooltip: `Your role: ${userRole}`,
                    },
                    {
                      text: reviewStatus,
                      tooltip: `Review status: ${reviewStatus}`,
                    },
                    {
                      text: formatRelativeDate(pr.creationDate),
                      tooltip: `Created: ${new Date(pr.creationDate).toLocaleString()}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Pull Request Actions">
                        <Action.Push
                          title="View Pr Details"
                          target={
                            <PullRequestDetailsView
                              pullRequestId={pr.pullRequestId.toString()}
                              initialTitle={pr.title}
                              project={pr.repository.project.name}
                            />
                          }
                          icon={Icon.Document}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        />
                        {prUrl && (
                          <Action.OpenInBrowser
                            title="Open in Azure Devops"
                            url={prUrl}
                            icon={Icon.Globe}
                            shortcut={{ modifiers: ["cmd"], key: "o" }}
                          />
                        )}
                        <Action.CopyToClipboard
                          title="Copy Pr ID"
                          content={pr.pullRequestId.toString()}
                          icon={Icon.Clipboard}
                        />
                        <Action.CopyToClipboard
                          title="Copy Pr Title"
                          content={pr.title}
                          icon={Icon.Text}
                        />
                        <Action.CopyToClipboard
                          title="Copy Source Branch"
                          content={sourceBranch}
                          icon={Icon.Tree}
                          shortcut={{ modifiers: ["cmd"], key: "b" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Pr URL"
                          content={prUrl}
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="List Actions">
                        <Action
                          title="Refresh List"
                          onAction={fetchPullRequests}
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            };

            return (
              <>
                {myPRs.length > 0 && (
                  <List.Section title={`Mine (${myPRs.length})`}>
                    {myPRs.map(renderPRItem)}
                  </List.Section>
                )}
                {otherPRs.length > 0 && (
                  <List.Section title={`Active (${otherPRs.length})`}>
                    {otherPRs.map(renderPRItem)}
                  </List.Section>
                )}
              </>
            );
          })()}
        </>
      )}
    </List>
  );
}
