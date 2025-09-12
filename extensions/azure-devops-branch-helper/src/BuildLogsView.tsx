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
