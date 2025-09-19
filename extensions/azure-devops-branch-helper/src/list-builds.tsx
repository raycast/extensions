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
import BuildLogsView from "./BuildLogsView";
import { runAz } from "./az-cli";
import { formatDuration } from "./utils/DateUtils";
import { getBuildStatusIcon, getBuildResultColor } from "./utils/IconUtils";
import { AuthenticationEmptyView } from "./components/AuthenticationEmptyView";
import { isAuthenticationError } from "./utils/AuthErrorHandler";

// Using runAz utility for all Azure CLI invocations

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface Build {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  sourceBranch: string;
  sourceVersion: string;
  definition: {
    id: number;
    name: string;
  };
  requestedFor: {
    displayName: string;
    uniqueName: string;
  };
  repository: {
    id: string;
    name: string;
  };
  reason: string;
  tags?: string[];
  triggerInfo?: {
    "ci.message"?: string;
    "ci.sourceBranch"?: string;
    "ci.sourceSha"?: string;
  };
}

const COMPLETED_BUILDS_PER_PAGE = 5;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeBuilds, setActiveBuilds] = useState<Build[]>([]);
  const [completedBuilds, setCompletedBuilds] = useState<Build[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCompletedItems, setTotalCompletedItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [authError, setAuthError] = useState(false);

  async function fetchBuilds(page = 0) {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      // Check if required configuration is available
      if (!preferences.azureOrganization) {
        throw new Error(
          "Azure DevOps organization URL is required. Please configure it in preferences.",
        );
      }

      // Add project if specified, otherwise try to get default from az devops configure
      if (!preferences.azureProject) {
        // If no project in preferences, show error with helpful message
        throw new Error(
          "Azure DevOps project name is required. Please configure it in preferences or run: az devops configure --defaults project=<ProjectName>",
        );
      }

      // Build base commands with required parameters - fetch separate status calls since comma-separated values not supported
      const inProgressArgs = [
        "pipelines",
        "build",
        "list",
        "--status",
        "inProgress",
        "--top",
        "10",
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization!,
        "--project",
        preferences.azureProject!,
      ];
      const notStartedArgs = [
        "pipelines",
        "build",
        "list",
        "--status",
        "notStarted",
        "--top",
        "10",
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization!,
        "--project",
        preferences.azureProject!,
      ];
      const completedArgs = [
        "pipelines",
        "build",
        "list",
        "--status",
        "completed",
        "--top",
        "50",
        "--output",
        "json",
        "--organization",
        preferences.azureOrganization!,
        "--project",
        preferences.azureProject!,
      ];

      const [inProgressResult, notStartedResult, completedResult] =
        await Promise.all([
          runAz(inProgressArgs),
          runAz(notStartedArgs),
          runAz(completedArgs),
        ]);

      const inProgressBuilds: Build[] = JSON.parse(inProgressResult.stdout);
      const notStartedBuilds: Build[] = JSON.parse(notStartedResult.stdout);
      const allCompletedBuilds: Build[] = JSON.parse(completedResult.stdout);

      // Combine active builds (inProgress + notStarted)
      const allActiveBuilds = [...inProgressBuilds, ...notStartedBuilds];

      // Sort active builds by queue time (newest first)
      const sortedActiveBuilds = allActiveBuilds.sort(
        (a, b) =>
          new Date(b.queueTime).getTime() - new Date(a.queueTime).getTime(),
      );

      // Sort completed builds by finish time (newest first) and paginate
      const sortedCompletedBuilds = allCompletedBuilds.sort((a, b) => {
        const aTime = a.finishTime || a.queueTime;
        const bTime = b.finishTime || b.queueTime;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Client-side pagination for completed builds
      const skipCount = page * COMPLETED_BUILDS_PER_PAGE;
      const paginatedCompletedBuilds = sortedCompletedBuilds.slice(
        skipCount,
        skipCount + COMPLETED_BUILDS_PER_PAGE,
      );

      setActiveBuilds(sortedActiveBuilds);
      setCompletedBuilds(paginatedCompletedBuilds);
      setTotalCompletedItems(sortedCompletedBuilds.length);
      setHasNextPage(
        skipCount + COMPLETED_BUILDS_PER_PAGE < sortedCompletedBuilds.length,
      );
      setCurrentPage(page);

      const totalBuilds =
        sortedActiveBuilds.length + paginatedCompletedBuilds.length;
      await showToast(
        Toast.Style.Success,
        "Loaded!",
        `${totalBuilds} builds (${sortedActiveBuilds.length} active, ${paginatedCompletedBuilds.length} completed)`,
      );
    } catch (error) {
      console.error(error);

      // Check if it's an authentication error
      if (isAuthenticationError(error)) {
        setAuthError(true);
        // Don't show toast for auth errors, the empty view will handle it
      } else {
        await showToast(Toast.Style.Failure, "Error", "Failed to fetch builds");
      }

      setActiveBuilds([]);
      setCompletedBuilds([]);
    } finally {
      setIsLoading(false);
    }
  }

  function getBuildUrl(build: Build): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization || !preferences.azureProject) return "";

    return `${preferences.azureOrganization}/${encodeURIComponent(preferences.azureProject || "")}/_build/results?buildId=${build.id}`;
  }

  function getActiveSectionTitle(): string {
    const count = activeBuilds.length;
    if (count === 0) return "Active Builds (None Running)";
    return `Active Builds (${count})`;
  }

  function getCompletedSectionTitle(): string {
    if (totalCompletedItems === 0) return "Recent Completed Builds";

    const startIndex = currentPage * COMPLETED_BUILDS_PER_PAGE + 1;
    const endIndex = Math.min(
      (currentPage + 1) * COMPLETED_BUILDS_PER_PAGE,
      totalCompletedItems,
    );
    return `Recent Completed Builds (${startIndex}-${endIndex} of ${totalCompletedItems})`;
  }

  function formatBuildReason(reason: string): string {
    switch (reason.toLowerCase()) {
      case "individualci":
        return "Individual CI";
      case "pullrequest":
        return "Pull Request";
      case "manual":
        return "Manual";
      case "batchedci":
        return "Batched CI";
      case "schedule":
        return "Scheduled";
      case "triggered":
        return "Triggered";
      default:
        return reason;
    }
  }

  function formatCompactDateTime(
    dateString?: string,
  ): { date: string; time: string } | null {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }

  function renderBuildItem(build: Build, keyPrefix: string) {
    const buildUrl = getBuildUrl(build);
    const statusIcon = getBuildStatusIcon(build.status);
    const statusColor = build.result
      ? getBuildResultColor(build.result)
      : getBuildResultColor(build.status);
    const duration = formatDuration(build.startTime, build.finishTime);

    // Get the detailed run information
    const runDescription = build.triggerInfo?.["ci.message"] || "Manual run";
    const shortCommit = build.sourceVersion.substring(0, 8);
    const branch = build.sourceBranch.replace("refs/heads/", "");

    // Format reason for display
    const reasonText = formatBuildReason(build.reason);

    // Get compact start time
    const compactStartTime = formatCompactDateTime(build.startTime);

    return (
      <List.Item
        key={`${keyPrefix}-${build.id}`}
        icon={{
          source: statusIcon,
          tintColor: statusColor,
        }}
        title={`${build.definition.name}`}
        subtitle={`${runDescription} • ${reasonText} for ${branch} • ${shortCommit}`}
        accessories={[
          {
            text: build.requestedFor.displayName,
            tooltip: `Requested by: ${build.requestedFor.displayName}`,
          },
          ...(compactStartTime
            ? [
                {
                  text: compactStartTime.date,
                  tooltip: build.startTime
                    ? `Started: ${new Date(build.startTime).toLocaleString()}`
                    : `Queued: ${new Date(build.queueTime).toLocaleString()}`,
                },
                {
                  text: compactStartTime.time,
                  tooltip: build.startTime
                    ? `Started: ${new Date(build.startTime).toLocaleString()}`
                    : `Queued: ${new Date(build.queueTime).toLocaleString()}`,
                },
              ]
            : []),
          {
            text: duration,
            tooltip: build.finishTime
              ? `Finished: ${new Date(build.finishTime).toLocaleString()}`
              : build.startTime
                ? `Started: ${new Date(build.startTime).toLocaleString()}`
                : `Queued: ${new Date(build.queueTime).toLocaleString()}`,
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Build Actions">
              <Action.Push
                title="View Build Logs"
                target={
                  <BuildLogsView
                    buildId={build.id}
                    buildNumber={build.buildNumber}
                    definitionName={build.definition.name}
                    status={build.status}
                  />
                }
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              {buildUrl && (
                <Action.OpenInBrowser
                  title="Open in Azure Devops"
                  url={buildUrl}
                  icon={Icon.Globe}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Build Number"
                content={build.buildNumber}
                icon={Icon.Clipboard}
              />
              <Action.CopyToClipboard
                title="Copy Build ID"
                content={build.id.toString()}
                icon={Icon.Hashtag}
              />
              <Action.CopyToClipboard
                title="Copy Branch Name"
                content={build.sourceBranch.replace("refs/heads/", "")}
                icon={Icon.Tree}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Navigation">
              {currentPage > 0 && (
                <Action
                  title="Previous Page"
                  onAction={() => fetchBuilds(currentPage - 1)}
                  icon={Icon.ChevronLeft}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "arrowLeft",
                  }}
                />
              )}
              {hasNextPage && (
                <Action
                  title="Next Page"
                  onAction={() => fetchBuilds(currentPage + 1)}
                  icon={Icon.ChevronRight}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "arrowRight",
                  }}
                />
              )}
              <Action
                title="Refresh"
                onAction={() => fetchBuilds(currentPage)}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  useEffect(() => {
    fetchBuilds(0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBuilds(currentPage);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentPage]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search builds..."
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            {currentPage > 0 && (
              <Action
                title="Previous Page"
                onAction={() => fetchBuilds(currentPage - 1)}
                icon={Icon.ChevronLeft}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "arrowLeft",
                }}
              />
            )}
            {hasNextPage && (
              <Action
                title="Next Page"
                onAction={() => fetchBuilds(currentPage + 1)}
                icon={Icon.ChevronRight}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "arrowRight",
                }}
              />
            )}
            <Action
              title="Refresh"
              onAction={() => fetchBuilds(currentPage)}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!isLoading &&
      activeBuilds.length === 0 &&
      completedBuilds.length === 0 ? (
        authError ? (
          <AuthenticationEmptyView />
        ) : (
          <List.EmptyView
            icon="🏗️"
            title="No Builds Found"
            description="No builds are available. This could mean no builds have been run recently, or there might be a configuration issue."
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigation">
                  <Action
                    title="Refresh"
                    onAction={() => fetchBuilds(currentPage)}
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        )
      ) : (
        <>
          {activeBuilds.length > 0 && (
            <List.Section title={getActiveSectionTitle()}>
              {activeBuilds.map((build) => renderBuildItem(build, "active"))}
            </List.Section>
          )}

          {completedBuilds.length > 0 && (
            <List.Section title={getCompletedSectionTitle()}>
              {completedBuilds.map((build) =>
                renderBuildItem(build, "completed"),
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
