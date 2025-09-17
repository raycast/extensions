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
import { getCurrentUser, convertToBranchName } from "./azure-devops";
import { formatRelativeDate } from "./utils/DateUtils";
import { getWorkItemTypeIcon, getStateColor } from "./utils/IconUtils";

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
  };
}

// The Azure CLI boards query returns work items directly as an array, not in a workItems wrapper

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("");

  async function fetchMyWorkItems() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();

      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Could not determine current Azure user");
      }
      setCurrentUser(user);

      // Use @Me macro to find work items assigned to current user
      const wiql =
        "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.State] <> 'Done' AND [System.State] <> 'Resolved' ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC";
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
      const workItemsData: WorkItem[] = JSON.parse(queryResult);

      if (workItemsData && workItemsData.length > 0) {
        setWorkItems(workItemsData);

        await showToast(
          Toast.Style.Success,
          "Loaded!",
          `Found ${workItemsData.length} work items assigned to you`,
        );
      } else {
        setWorkItems([]);
        await showToast(
          Toast.Style.Success,
          "No work items",
          "No active work items assigned to you",
        );
      }
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Error",
        "Failed to fetch work items",
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

  useEffect(() => {
    fetchMyWorkItems();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search work items...">
      {!isLoading && workItems.length === 0 ? (
        <List.EmptyView
          icon="🎉"
          title="Congratulations! You have no assigned tasks!"
          description="Time to celebrate - your work queue is empty! Either you're incredibly productive, or it's time to pick up some new work items."
          actions={
            <ActionPanel>
              <Action
                title="Refresh List"
                onAction={fetchMyWorkItems}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Work Items Assigned to ${currentUser || "You"}`}>
          {workItems.map((workItem) => {
            const workItemUrl = getWorkItemUrl(workItem);
            const preferences = getPreferenceValues<Preferences>();
            const branchName = convertToBranchName(
              workItem.id.toString(),
              workItem.fields["System.Title"],
              preferences.branchPrefix,
            );

            return (
              <List.Item
                key={workItem.id}
                icon={{
                  source: getWorkItemTypeIcon(
                    workItem.fields["System.WorkItemType"],
                  ),
                  tintColor: getStateColor(workItem.fields["System.State"]),
                }}
                title={`#${workItem.id}: ${workItem.fields["System.Title"]}`}
                subtitle={workItem.fields["System.WorkItemType"]}
                accessories={[
                  {
                    text: workItem.fields["System.State"],
                    tooltip: `State: ${workItem.fields["System.State"]}`,
                  },
                  {
                    text: workItem.fields["System.TeamProject"],
                    tooltip: `Project: ${workItem.fields["System.TeamProject"]}`,
                  },
                  {
                    text: formatRelativeDate(
                      workItem.fields["System.ChangedDate"],
                    ),
                    tooltip: `Last updated: ${new Date(workItem.fields["System.ChangedDate"]).toLocaleString()}`,
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
                    <ActionPanel.Section title="List Actions">
                      <Action
                        title="Refresh List"
                        onAction={fetchMyWorkItems}
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
