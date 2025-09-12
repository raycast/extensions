import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
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

interface Props {
  pullRequestId: string;
  initialTitle?: string;
  project?: string;
}

interface PullRequestDetails {
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
  };
  reviewers: Array<{
    displayName: string;
    uniqueName: string;
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
  lastMergeSourceCommit?: {
    commitId: string;
    comment: string;
  };
  lastMergeTargetCommit?: {
    commitId: string;
  };
  mergeId?: string;
  url?: string;
}

export default function PullRequestDetailsView({
  pullRequestId,
  initialTitle,
  project,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [prDetails, setPrDetails] = useState<PullRequestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchPullRequestDetails() {
    setIsLoading(true);
    setError(null);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      // Check if required configuration is available
      if (!preferences.azureOrganization) {
        throw new Error(
          "Azure DevOps organization URL is required. Please configure it in preferences.",
        );
      }

      const projectToUse = project || preferences.azureProject;
      if (!projectToUse) {
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences.",
        );
      }

      // Build command to get PR details
      // According to az repos pr show --help, it only supports:
      // --id (required), --organization, --detect, --open
      // It does NOT support --project or --repository parameters
      const prCommand = `${azCommand} repos pr show --id ${pullRequestId} --output json --organization "${preferences.azureOrganization}"`;

      const { stdout: prResult } = await execAsync(prCommand);
      const prData: PullRequestDetails = JSON.parse(prResult);

      setPrDetails(prData);

      await showToast(
        Toast.Style.Success,
        "Loaded!",
        `PR #${prData.pullRequestId}: ${prData.title}`,
      );
    } catch (error) {
      const errorMessage = "Failed to fetch pull request details";
      setError(errorMessage);
      await showToast(Toast.Style.Failure, "Error", errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  function generateMarkdown(): string {
    if (!prDetails) return "Loading pull request details...";

    const statusEmoji = getStatusEmoji(prDetails.status, prDetails.isDraft);
    const sourceBranch = prDetails.sourceRefName.replace("refs/heads/", "");
    const targetBranch = prDetails.targetRefName.replace("refs/heads/", "");

    let markdown = `# ${statusEmoji} ${prDetails.title}\n\n`;

    // Basic PR info
    markdown += `**Status:** ${prDetails.isDraft ? "Draft" : prDetails.status} • `;
    markdown += `**Merge Status:** ${prDetails.mergeStatus} • `;
    markdown += `**Created:** ${formatDate(prDetails.creationDate)}\n\n`;

    markdown += `**Branch:** ${sourceBranch} → ${targetBranch}\n\n`;
    markdown += `**Repository:** ${prDetails.repository.name} • `;
    markdown += `**Created by:** ${prDetails.createdBy.displayName}\n\n`;

    // Description
    if (prDetails.description && prDetails.description.trim()) {
      markdown += `## Description\n\n${prDetails.description}\n\n`;
    }

    markdown += `---\n\n`;

    // Reviewers section
    if (prDetails.reviewers && prDetails.reviewers.length > 0) {
      markdown += `## Reviewers\n\n`;
      prDetails.reviewers.forEach((reviewer) => {
        const voteEmoji = getVoteEmoji(reviewer.vote);
        const requiredText = reviewer.isRequired ? " (Required)" : "";
        markdown += `${voteEmoji} **${reviewer.displayName}**${requiredText}\n`;
      });
      markdown += `\n`;
    }

    // Commit info
    if (prDetails.lastMergeSourceCommit) {
      markdown += `## Latest Commit\n\n`;
      const shortCommit = prDetails.lastMergeSourceCommit.commitId.substring(
        0,
        8,
      );
      markdown += `**${shortCommit}**: ${prDetails.lastMergeSourceCommit.comment}\n\n`;
    }

    // Merge conflicts warning
    if (prDetails.mergeStatus.toLowerCase() === "conflicts") {
      markdown += `⚠️ **Merge Conflicts**: This pull request has conflicts that need to be resolved before merging.\n\n`;
    }

    return markdown;
  }

  function getStatusEmoji(status: string, isDraft: boolean): string {
    if (isDraft) return "📝";

    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
      case "active":
        return "🔄";
      case "completed":
        return "✅";
      case "abandoned":
        return "❌";
      default:
        return "⚪";
    }
  }

  function getVoteEmoji(vote: number): string {
    if (vote > 0) return "✅"; // Approved
    if (vote < 0) return "❌"; // Rejected/Changes requested
    return "⏳"; // Waiting for review
  }

  function formatDate(dateString: string): string {
    if (!dateString) return "Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
  }

  function getPullRequestUrl(): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization || !prDetails) return "";

    const projectName = prDetails.repository.project.name;
    const repoName = prDetails.repository.name;

    return `${preferences.azureOrganization}/${encodeURIComponent(projectName)}/_git/${encodeURIComponent(repoName)}/pullrequest/${prDetails.pullRequestId}`;
  }

  useEffect(() => {
    fetchPullRequestDetails();
  }, [pullRequestId]);

  const prUrl = getPullRequestUrl();

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nPR ID: ${pullRequestId}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={fetchPullRequestDetails}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={generateMarkdown()}
      navigationTitle={`PR #${pullRequestId}${initialTitle ? `: ${initialTitle}` : ""}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Pull Request Actions">
            {prUrl && (
              <Action.OpenInBrowser
                title="Open Pr in Azure Devops"
                url={prUrl}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Pr URL"
              content={prUrl || ""}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action.CopyToClipboard
              title="Copy Pr ID"
              content={pullRequestId}
              icon={Icon.Hashtag}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {prDetails && (
              <>
                <Action.CopyToClipboard
                  title="Copy Pr Title"
                  content={prDetails.title}
                  icon={Icon.Text}
                />
                <Action.CopyToClipboard
                  title="Copy Source Branch"
                  content={prDetails.sourceRefName.replace("refs/heads/", "")}
                  icon={Icon.Tree}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View Actions">
            <Action
              title="Refresh"
              onAction={fetchPullRequestDetails}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
