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
import ActivateAndBranchForm from "./ActivateAndBranchForm";
import WorkItemDetailsView from "./WorkItemDetailsView";

const execAsync = promisify(exec);

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

  async function getCurrentUser() {
    try {
      const azCommand = "/opt/homebrew/bin/az";

      // Try to get the user in different formats to see which one works
      const { stdout: userEmail } = await execAsync(
        `${azCommand} account show --query user.name -o tsv`,
      );

      return userEmail.trim();
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  }

  async function fetchMyWorkItems() {
    setIsLoading(true);
    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Could not determine current Azure user");
      }
      setCurrentUser(user);

      // Use @Me macro to find work items assigned to current user
      let queryCommand = `${azCommand} boards query --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' AND [System.State] <> 'Done' ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC" --output json`;

      if (preferences.azureOrganization) {
        queryCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      if (preferences.azureProject) {
        queryCommand += ` --project "${preferences.azureProject}"`;
      }

      const { stdout: queryResult } = await execAsync(queryCommand);

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

  function getWorkItemTypeIcon(type: string): Icon {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case "bug":
        return Icon.Bug;
      case "task":
        return Icon.CheckCircle;
      case "user story":
      case "story":
        return Icon.Person;
      case "product backlog item":
      case "pbi":
        return Icon.List;
      case "feature":
        return Icon.Star;
      case "epic":
        return Icon.Crown;
      case "issue":
        return Icon.ExclamationMark;
      case "test case":
        return Icon.Play;
      case "test suite":
        return Icon.Folder;
      case "test plan":
        return Icon.Document;
      case "requirement":
        return Icon.Text;
      case "code review request":
        return Icon.Eye;
      default:
        return Icon.Circle;
    }
  }

  function getStateColor(state: string): Color {
    const lowerState = state.toLowerCase();
    switch (lowerState) {
      case "new":
      case "to do":
      case "proposed":
        return Color.Blue;
      case "active":
      case "in progress":
      case "committed":
      case "approved":
        return Color.Orange;
      case "resolved":
      case "done":
      case "completed":
        return Color.Green;
      case "closed":
      case "removed":
        return Color.SecondaryText;
      case "blocked":
      case "on hold":
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

  function convertToBranchName(
    number: string,
    description: string,
    prefix: string,
  ): string {
    const combined = `${number} ${description}`;
    const slug = combined
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${prefix}${slug}`;
  }

  useEffect(() => {
    fetchMyWorkItems();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search work items...">
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
                  text: formatDate(workItem.fields["System.ChangedDate"]),
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
    </List>
  );
}
