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
import ActivateAndBranchForm from "./ActivateAndBranchForm";
import WorkItemDetailsView from "./WorkItemDetailsView";
import { convertToBranchName } from "./azure-devops";
import { formatRelativeDate } from "./utils/DateUtils";
import { getWorkItemTypeIcon, getStateColor } from "./utils/IconUtils";

// Azure CLI runner imported via runAz utility

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface WorkItem {
  id: number;
  fields: {
    "System.Title": string;
    "System.WorkItemType": string;
    "System.State": string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.TeamProject": string;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "Microsoft.VSTS.Common.StackRank"?: number;
  };
}

const ITEMS_PER_PAGE = 8;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [viewMode, setViewMode] = useState<"backlog" | "recent">("backlog");

  async function fetchBacklogItems(page = 0) {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      // Calculate SKIP value for pagination
      const skipCount = page * ITEMS_PER_PAGE;

      // WIQL query to get backlog items (Product Backlog Items, User Stories, Features, Epics)
      // Order by StackRank (backlog priority) and then by creation date
      const wiql =
        "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Common.StackRank] FROM WorkItems WHERE [System.WorkItemType] IN ('Product Backlog Item', 'User Story', 'Feature', 'Epic', 'Bug', 'Task') AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.State] <> 'Done' AND [System.State] <> 'Resolved' ORDER BY [Microsoft.VSTS.Common.StackRank] ASC, [System.CreatedDate] DESC";
      const { stdout: queryResult } = await runAz([
        "boards",
        "query",
        "--wiql",
        wiql,
        "--output",
        "json",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
        ...(preferences.azureProject
          ? ["--project", preferences.azureProject]
          : []),
      ]);

      // The Azure CLI boards query returns work items directly as an array
      const allWorkItems: WorkItem[] = JSON.parse(queryResult);

      // Client-side pagination since WIQL doesn't support SKIP/TOP reliably
      const startIndex = skipCount;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const pageItems = allWorkItems.slice(startIndex, endIndex);

      setWorkItems(pageItems);
      setTotalItems(allWorkItems.length);
      setHasNextPage(endIndex < allWorkItems.length);
      setCurrentPage(page);
      setViewMode("backlog");

      const pageInfo = `Page ${page + 1} (${startIndex + 1}-${Math.min(endIndex, allWorkItems.length)} of ${allWorkItems.length})`;

      if (pageItems.length > 0) {
        await showToast(
          Toast.Style.Success,
          "Loaded!",
          `${pageInfo} backlog items`,
        );
      } else {
        await showToast(
          Toast.Style.Success,
          "No items",
          "No backlog items found",
        );
      }
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to fetch backlog items",
      );
      console.error(error);
      setWorkItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRecentlyCreatedItems(page = 0) {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      // Calculate SKIP value for pagination
      const skipCount = page * ITEMS_PER_PAGE;

      // WIQL query to get recently created work items (last 30 days)
      // Order by creation date (newest first)
      const wiqlRecent =
        "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority], [Microsoft.VSTS.Common.StackRank] FROM WorkItems WHERE [System.WorkItemType] IN ('Product Backlog Item', 'User Story', 'Feature', 'Epic', 'Bug', 'Task') AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.State] <> 'Done' AND [System.State] <> 'Resolved' AND [System.CreatedDate] > @Today - 30 ORDER BY [System.CreatedDate] DESC";
      const { stdout: queryResult } = await runAz([
        "boards",
        "query",
        "--wiql",
        wiqlRecent,
        "--output",
        "json",
        ...(preferences.azureOrganization
          ? ["--organization", preferences.azureOrganization]
          : []),
        ...(preferences.azureProject
          ? ["--project", preferences.azureProject]
          : []),
      ]);

      // The Azure CLI boards query returns work items directly as an array
      const allWorkItems: WorkItem[] = JSON.parse(queryResult);

      // Client-side pagination
      const startIndex = skipCount;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const pageItems = allWorkItems.slice(startIndex, endIndex);

      setWorkItems(pageItems);
      setTotalItems(allWorkItems.length);
      setHasNextPage(endIndex < allWorkItems.length);
      setCurrentPage(page);
      setViewMode("recent");

      const pageInfo = `Page ${page + 1} (${startIndex + 1}-${Math.min(endIndex, allWorkItems.length)} of ${allWorkItems.length})`;

      if (pageItems.length > 0) {
        await showToast(
          Toast.Style.Success,
          "Loaded!",
          `${pageInfo} recently created items`,
        );
      } else {
        await showToast(
          Toast.Style.Success,
          "No recent items",
          "No work items created in the last 30 days",
        );
      }
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to fetch recently created items",
      );
      console.error(error);
      setWorkItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  function getWorkItemUrl(workItem: WorkItem): string {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization) return "";

    const projectFromWorkItem = workItem.fields["System.TeamProject"];
    const projectToUse =
      projectFromWorkItem || preferences.azureProject || "Unknown";

    return `${preferences.azureOrganization}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItem.id}`;
  }

  function getPaginationTitle(): string {
    const baseTitle = viewMode === "recent" ? "Recently Created" : "Backlog";

    if (totalItems === 0) return baseTitle;

    const startIndex = currentPage * ITEMS_PER_PAGE + 1;
    const endIndex = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalItems);
    return `${baseTitle} (${startIndex}-${endIndex} of ${totalItems})`;
  }

  function handlePageNavigation(page: number) {
    if (viewMode === "recent") {
      fetchRecentlyCreatedItems(page);
    } else {
      fetchBacklogItems(page);
    }
  }

  function handleRefresh() {
    if (viewMode === "recent") {
      fetchRecentlyCreatedItems(currentPage);
    } else {
      fetchBacklogItems(currentPage);
    }
  }

  useEffect(() => {
    fetchBacklogItems(0);
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search backlog items..."
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View Actions">
            <Action
              title="Show Recently Created"
              onAction={() => fetchRecentlyCreatedItems(0)}
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action
              title="Show Backlog"
              onAction={() => fetchBacklogItems(0)}
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Pagination">
            {currentPage > 0 && (
              <Action
                title="Previous Page"
                onAction={() => handlePageNavigation(currentPage - 1)}
                icon={Icon.ChevronLeft}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
              />
            )}
            {hasNextPage && (
              <Action
                title="Next Page"
                onAction={() => handlePageNavigation(currentPage + 1)}
                icon={Icon.ChevronRight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
              />
            )}
            <Action
              title="Refresh"
              onAction={handleRefresh}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!isLoading && workItems.length === 0 ? (
        <List.EmptyView
          icon="📋"
          title={
            viewMode === "recent" ? "No Recent Work Items" : "Empty Backlog"
          }
          description={
            viewMode === "recent"
              ? "No work items created in the last 30 days. Time to start creating some new items!"
              : "The backlog is empty. Time to add some work items to get started!"
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="View Actions">
                <Action
                  title="Show Recently Created"
                  onAction={() => fetchRecentlyCreatedItems(0)}
                  icon={Icon.Clock}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action
                  title="Show Backlog"
                  onAction={() => fetchBacklogItems(0)}
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Refresh">
                <Action
                  title="Refresh"
                  onAction={handleRefresh}
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={getPaginationTitle()}>
          {workItems.map((workItem, index) => {
            const workItemUrl = getWorkItemUrl(workItem);
            const preferences = getPreferenceValues<Preferences>();
            const branchName = convertToBranchName(
              workItem.id.toString(),
              workItem.fields["System.Title"],
              preferences.branchPrefix,
            );

            // Show position in current list
            const listPosition = currentPage * ITEMS_PER_PAGE + index + 1;
            const positionPrefix = viewMode === "recent" ? "#" : "#";

            return (
              <List.Item
                key={workItem.id}
                icon={{
                  source: getWorkItemTypeIcon(
                    workItem.fields["System.WorkItemType"],
                  ),
                  tintColor: getStateColor(workItem.fields["System.State"]),
                }}
                title={`${positionPrefix}${listPosition}: ${workItem.fields["System.Title"]}`}
                subtitle={`#${workItem.id} - ${workItem.fields["System.WorkItemType"]}`}
                accessories={[
                  {
                    text: workItem.fields["System.State"],
                    tooltip: `State: ${workItem.fields["System.State"]}`,
                  },
                  {
                    text:
                      workItem.fields["System.AssignedTo"]?.displayName ||
                      "Unassigned",
                    tooltip: `Assigned to: ${workItem.fields["System.AssignedTo"]?.displayName || "Unassigned"}`,
                  },
                  {
                    text: formatRelativeDate(
                      viewMode === "recent"
                        ? workItem.fields["System.CreatedDate"]
                        : workItem.fields["System.ChangedDate"],
                    ),
                    tooltip:
                      viewMode === "recent"
                        ? `Created: ${new Date(workItem.fields["System.CreatedDate"]).toLocaleString()}`
                        : `Last updated: ${new Date(workItem.fields["System.ChangedDate"]).toLocaleString()}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Work Item Actions">
                      <Action.Push
                        title="View Work Item Details"
                        target={
                          <WorkItemDetailsView
                            workItemId={workItem.id.toString()}
                            initialTitle={workItem.fields["System.Title"]}
                          />
                        }
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <Action.Push
                        title="Activate & Create Branch"
                        target={
                          <ActivateAndBranchForm
                            initialWorkItemId={workItem.id.toString()}
                          />
                        }
                        icon={Icon.Rocket}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      />
                      {workItemUrl && (
                        <Action.OpenInBrowser
                          title="Open in Azure Devops"
                          url={workItemUrl}
                          icon={Icon.Globe}
                        />
                      )}
                      <Action.CopyToClipboard
                        title="Copy Work Item ID"
                        content={workItem.id.toString()}
                        icon={Icon.Clipboard}
                      />
                      <Action.CopyToClipboard
                        title="Copy Work Item Title"
                        content={workItem.fields["System.Title"]}
                        icon={Icon.Text}
                      />
                      <Action.CopyToClipboard
                        title="Copy Branch Name"
                        content={branchName}
                        icon={Icon.Code}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="View Actions">
                      <Action
                        title="Show Recently Created"
                        onAction={() => fetchRecentlyCreatedItems(0)}
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      />
                      <Action
                        title="Show Backlog"
                        onAction={() => fetchBacklogItems(0)}
                        icon={Icon.List}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Pagination">
                      {currentPage > 0 && (
                        <Action
                          title="Previous Page"
                          onAction={() => handlePageNavigation(currentPage - 1)}
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
                          onAction={() => handlePageNavigation(currentPage + 1)}
                          icon={Icon.ChevronRight}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "arrowRight",
                          }}
                        />
                      )}
                      <Action
                        title="Refresh"
                        onAction={handleRefresh}
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
      )}
    </List>
  );
}
