import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

  async function getCurrentUser() {
    try {
      const azCommand = "/opt/homebrew/bin/az";
      const { stdout: userEmail } = await execAsync(
        `${azCommand} account show --query user.name -o tsv`,
      );
      return userEmail.trim();
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }

  async function fetchPullRequests() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

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

      // Fetch PRs where user is the creator
      let createdPRsCommand = `${azCommand} repos pr list --creator "${user}" --status active --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      if (preferences.azureRepository) {
        createdPRsCommand += ` --repository "${preferences.azureRepository}"`;
      }

      // Fetch PRs where user is a reviewer
      let reviewPRsCommand = `${azCommand} repos pr list --reviewer "${user}" --status active --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      if (preferences.azureRepository) {
        reviewPRsCommand += ` --repository "${preferences.azureRepository}"`;
      }

      const [createdResult, reviewResult] = await Promise.all([
        execAsync(createdPRsCommand),
        execAsync(reviewPRsCommand),
      ]);

      const createdPRs: PullRequest[] = JSON.parse(createdResult.stdout);
      const reviewPRs: PullRequest[] = JSON.parse(reviewResult.stdout);

      // Combine and deduplicate PRs (in case user is both author and reviewer)
      const allPRs = [...createdPRs];
      reviewPRs.forEach((reviewPR) => {
        if (!allPRs.some((pr) => pr.pullRequestId === reviewPR.pullRequestId)) {
          allPRs.push(reviewPR);
        }
      });

      // Sort by creation date (newest first)
      const sortedPRs = allPRs.sort(
        (a, b) =>
          new Date(b.creationDate).getTime() -
          new Date(a.creationDate).getTime(),
      );

      setPullRequests(sortedPRs);

      if (sortedPRs.length > 0) {
        await showToast(
          Toast.Style.Success,
          "Loaded!",
          `Found ${sortedPRs.length} pull requests (${createdPRs.length} created, ${reviewPRs.length} to review)`,
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

  function getPRStatusIcon(status: string, isDraft: boolean): Icon {
    if (isDraft) return Icon.Document;

    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
      case "active":
        return Icon.Circle;
      case "completed":
        return Icon.CheckCircle;
      case "abandoned":
        return Icon.XMarkCircle;
      default:
        return Icon.Circle;
    }
  }

  function getPRStatusColor(
    status: string,
    isDraft: boolean,
    mergeStatus: string,
  ): Color {
    if (isDraft) return Color.SecondaryText;

    const lowerStatus = status.toLowerCase();
    const lowerMergeStatus = mergeStatus.toLowerCase();

    if (lowerStatus === "active") {
      if (lowerMergeStatus === "conflicts") {
        return Color.Red;
      }
      return Color.Orange;
    }

    switch (lowerStatus) {
      case "completed":
        return Color.Green;
      case "abandoned":
        return Color.Red;
      default:
        return Color.PrimaryText;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
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
      <List.Section title={`Pull Requests (${currentUser || "You"})`}>
        {pullRequests.map((pr) => {
          const prUrl = getPullRequestUrl(pr);
          const userRole = getUserRole(pr, currentUser);
          const reviewStatus = getReviewStatus(pr, currentUser);
          const sourceBranch = formatBranchName(pr.sourceRefName);
          const targetBranch = formatBranchName(pr.targetRefName);

          return (
            <List.Item
              key={pr.pullRequestId}
              icon={{
                source: getPRStatusIcon(pr.status, pr.isDraft),
                tintColor: getPRStatusColor(
                  pr.status,
                  pr.isDraft,
                  pr.mergeStatus,
                ),
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
                  text: formatDate(pr.creationDate),
                  tooltip: `Created: ${new Date(pr.creationDate).toLocaleString()}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Pull Request Actions">
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
                      icon={Icon.Branch}
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
        })}
      </List.Section>
    </List>
  );
}
