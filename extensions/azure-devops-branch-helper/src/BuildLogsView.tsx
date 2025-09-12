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
  buildId: number;
  buildNumber: string;
  definitionName: string;
  status: string;
}

interface BuildDetails {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  startTime?: string;
  finishTime?: string;
  sourceBranch: string;
  sourceVersion: string;
  definition: {
    name: string;
  };
  requestedFor: {
    displayName: string;
  };
  repository: {
    name: string;
  };
  logs?: BuildLog[];
  triggerInfo?: {
    "ci.message"?: string;
    "ci.sourceBranch"?: string;
    "ci.sourceSha"?: string;
  };
}

interface BuildLog {
  id: number;
  type: string;
  url: string;
  lineCount?: number;
}

interface PullRequest {
  pullRequestId: number;
  title: string;
  status: string;
  creationDate: string;
  repository: {
    name: string;
    project: {
      name: string;
    };
  };
}

export default function BuildLogsView({
  buildId,
  buildNumber,
  definitionName,
  status,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [buildDetails, setBuildDetails] = useState<BuildDetails | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [existingPR, setExistingPR] = useState<PullRequest | null>(null);
  const [isCheckingPR, setIsCheckingPR] = useState(false);

  async function fetchBuildDetails() {
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

      if (!preferences.azureProject) {
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences.",
        );
      }

      // Fetch build details
      const buildCommand = `${azCommand} pipelines build show --id ${buildId} --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}"`;

      const { stdout: buildResult } = await execAsync(buildCommand);
      const buildData: BuildDetails = JSON.parse(buildResult);

      setBuildDetails(buildData);
      await fetchBuildLogs();
      await checkForExistingPR(buildData);
    } catch (error) {
      const errorMessage = "Failed to fetch build details";
      setError(errorMessage);
      await showToast(Toast.Style.Failure, "Error", errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchBuildLogs() {
    // Skip fetching logs since they're not available via CLI
    // Just show the build URL for direct access
    const buildUrl = getBuildUrl();
    if (buildUrl) {
      setLogs(
        `🔗 **View Build Logs:** ${buildUrl}\n\n📋 **Quick Actions:**\n• Press ⌘O to open in Azure DevOps\n• View live logs and detailed output\n• Monitor build progress in real-time`,
      );
    } else {
      setLogs(
        "Configure Azure DevOps organization and project in preferences to view build logs.",
      );
    }
  }

  function generateMarkdown(): string {
    if (!buildDetails) return "Loading build details...";

    const statusEmoji = getStatusEmoji(
      buildDetails.status,
      buildDetails.result,
    );
    const duration = formatDuration(
      buildDetails.startTime,
      buildDetails.finishTime,
    );

    // Get run description from trigger info
    const runDescription =
      buildDetails.triggerInfo?.["ci.message"] || "Manual run";
    const shortCommit =
      buildDetails.sourceVersion?.substring(0, 8) || "unknown";

    let markdown = `# ${statusEmoji} ${definitionName}\n\n`;

    // Show the detailed run description prominently
    markdown += `**${runDescription}**\n\n`;

    // Build status and metadata
    markdown += `**Status:** ${buildDetails.status}${buildDetails.result ? ` (${buildDetails.result})` : ""} • `;
    markdown += `**Duration:** ${duration} • `;
    markdown += `**Branch:** ${buildDetails.sourceBranch.replace("refs/heads/", "")} • `;
    markdown += `**Commit:** ${shortCommit} • `;
    markdown += `**Repository:** ${buildDetails.repository.name} • `;
    markdown += `**Requested by:** ${buildDetails.requestedFor.displayName}\n\n`;

    if (buildDetails.startTime) {
      markdown += `**Started:** ${new Date(buildDetails.startTime).toLocaleString()}\n\n`;
    }

    markdown += `---\n\n`;

    // Show existing PR info if found
    if (existingPR) {
      const prUrl = getPRUrl(existingPR);
      markdown += `📥 **Pull Request Found**: [PR #${existingPR.pullRequestId}: ${existingPR.title}](${prUrl})\n`;
      markdown += `• Status: ${existingPR.status} • Created: ${formatDate(existingPR.creationDate)}\n\n`;
    } else if (isCheckingPR) {
      markdown += `🔍 **Checking for existing pull requests...**\n\n`;
    }

    // Build logs/info
    if (logs) {
      markdown += `${logs}\n`;
    } else {
      markdown += `*Loading build information...*\n`;
    }

    return markdown;
  }

  function getStatusEmoji(status: string, result?: string): string {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus === "completed" && result) {
      const lowerResult = result.toLowerCase();
      switch (lowerResult) {
        case "succeeded":
          return "✅";
        case "failed":
          return "❌";
        case "canceled":
          return "⏹️";
        case "partiallysucceeded":
          return "⚠️";
        default:
          return "⚪";
      }
    }

    switch (lowerStatus) {
      case "inprogress":
        return "🔄";
      case "notstarted":
        return "⏸️";
      case "cancelling":
        return "🛑";
      default:
        return "⚪";
    }
  }

  function formatDuration(startTime?: string, finishTime?: string): string {
    if (!startTime) return "Not started";

    const start = new Date(startTime);
    const end = finishTime ? new Date(finishTime) : new Date();

    // Check if dates are valid
    if (isNaN(start.getTime())) {
      return "Invalid start time";
    }
    if (finishTime && isNaN(end.getTime())) {
      return "Invalid end time";
    }

    const diffMs = end.getTime() - start.getTime();

    // If the difference is negative or unreasonably large, something is wrong
    if (diffMs < 0) {
      return "Future build";
    }

    // If duration is more than 3 hours, something is likely wrong with the data
    if (diffMs > 3 * 60 * 60 * 1000) {
      return "Check build times";
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (diffMinutes > 60) {
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`;
    } else {
      return `${diffSeconds}s`;
    }
  }

  function getBuildUrl(): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization || !preferences.azureProject) return "";

    return `${preferences.azureOrganization}/${encodeURIComponent(preferences.azureProject)}/_build/results?buildId=${buildId}`;
  }

  async function checkForExistingPR(buildDetails: BuildDetails) {
    if (
      buildDetails.status !== "completed" ||
      buildDetails.result !== "succeeded"
    ) {
      return; // Only check for PRs on successful builds
    }

    setIsCheckingPR(true);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      if (!preferences.azureOrganization || !preferences.azureProject) {
        return; // Can't check without required config
      }

      const repositoryName =
        preferences.azureRepository || buildDetails.repository.name;
      if (!repositoryName) {
        return;
      }

      const sourceBranch = buildDetails.sourceBranch.replace("refs/heads/", "");

      // Search for active PRs from this source branch
      const prListCommand = `${azCommand} repos pr list --source-branch "${sourceBranch}" --status active --output json --organization "${preferences.azureOrganization}" --project "${preferences.azureProject}" --repository "${repositoryName}"`;

      const { stdout: prResult } = await execAsync(prListCommand);
      const prs = JSON.parse(prResult);

      if (prs && prs.length > 0) {
        // Found existing PR(s), use the first one
        setExistingPR(prs[0]);
      } else {
        setExistingPR(null);
      }
    } catch (error) {
      // Silently fail - PR checking is optional
      console.log("Could not check for existing PRs:", error);
      setExistingPR(null);
    } finally {
      setIsCheckingPR(false);
    }
  }

  async function createPullRequest() {
    if (
      !buildDetails ||
      buildDetails.status !== "completed" ||
      buildDetails.result !== "succeeded"
    ) {
      await showToast(
        Toast.Style.Failure,
        "Cannot create PR",
        "Build must be completed and successful",
      );
      return;
    }

    setIsCreatingPR(true);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      if (!preferences.azureOrganization || !preferences.azureProject) {
        throw new Error("Azure DevOps organization and project are required");
      }

      // Use repository from build details if not configured in preferences
      const repositoryName =
        preferences.azureRepository || buildDetails.repository.name;

      if (!repositoryName) {
        throw new Error(
          "Azure DevOps repository could not be determined. Please configure it in preferences.",
        );
      }

      const sourceBranch = buildDetails.sourceBranch.replace("refs/heads/", "");
      const targetBranch = preferences.sourceBranch || "main";

      // Check if source branch is different from target branch
      if (sourceBranch === targetBranch) {
        await showToast(
          Toast.Style.Failure,
          "Cannot create PR",
          `Source branch (${sourceBranch}) cannot be the same as target branch (${targetBranch})`,
        );
        return;
      }

      // Get commit message for PR title and description
      const commitMessage =
        buildDetails.triggerInfo?.["ci.message"] || "Automated changes";
      const shortCommit = buildDetails.sourceVersion.substring(0, 8);

      // Create pull request using Azure CLI
      const createPRCommand = `${azCommand} repos pr create \
        --source-branch "${sourceBranch}" \
        --target-branch "${targetBranch}" \
        --title "${commitMessage}" \
        --description "PR created from successful build #${buildDetails.buildNumber}

**Build Details:**
- Build ID: ${buildDetails.id}
- Commit: ${shortCommit}
- Status: ${buildDetails.status} (${buildDetails.result})
- Repository: ${buildDetails.repository.name}
- Requested by: ${buildDetails.requestedFor.displayName}

This PR was created automatically after a successful build." \
        --output json \
        --organization "${preferences.azureOrganization}" \
        --project "${preferences.azureProject}" \
        --repository "${repositoryName}"`;

      const { stdout: prResult } = await execAsync(createPRCommand);
      const prData = JSON.parse(prResult);

      await showToast(
        Toast.Style.Success,
        "Pull Request Created",
        `PR #${prData.pullRequestId}: ${commitMessage}`,
      );

      return prData;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create pull request";
      await showToast(Toast.Style.Failure, "Error Creating PR", errorMessage);
      console.error("Failed to create PR:", error);
    } finally {
      setIsCreatingPR(false);
    }
  }

  function getPRUrl(pr: PullRequest | null): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization || !pr) return "";

    const projectName =
      pr.repository?.project?.name || preferences.azureProject;
    const repoName = pr.repository?.name;

    if (!projectName || !repoName) return "";

    return `${preferences.azureOrganization}/${encodeURIComponent(projectName)}/_git/${encodeURIComponent(repoName)}/pullrequest/${pr.pullRequestId}`;
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

  // Auto-refresh every 10 seconds for active builds
  useEffect(() => {
    fetchBuildDetails();

    let interval: NodeJS.Timeout;

    if (
      status.toLowerCase() === "inprogress" ||
      status.toLowerCase() === "notstarted"
    ) {
      interval = setInterval(() => {
        fetchBuildDetails(); // Refresh build details instead of logs
      }, 10000); // Refresh every 10 seconds for active builds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [buildId]);

  const buildUrl = getBuildUrl();

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nBuild ID: ${buildId}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={fetchBuildDetails}
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
      navigationTitle={`Build #${buildNumber}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Build Actions">
            {buildDetails &&
              buildDetails.status === "completed" &&
              buildDetails.result === "succeeded" && (
                <>
                  {existingPR ? (
                    <Action.OpenInBrowser
                      title="Open Pull Request"
                      url={getPRUrl(existingPR)}
                      icon={Icon.GitBranch}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  ) : (
                    <Action
                      title={
                        isCreatingPR ? "Creating Pr…" : "Create Pull Request"
                      }
                      onAction={createPullRequest}
                      icon={Icon.GitBranch}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    />
                  )}
                </>
              )}
            {buildUrl && (
              <Action.OpenInBrowser
                title="Open Build in Azure Devops"
                url={buildUrl}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Build URL"
              content={buildUrl || ""}
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action.CopyToClipboard
              title="Copy Build Number"
              content={buildNumber}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Build ID"
              content={buildId.toString()}
              icon={Icon.Hashtag}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="View Actions">
            <Action
              title="Refresh"
              onAction={fetchBuildDetails}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
