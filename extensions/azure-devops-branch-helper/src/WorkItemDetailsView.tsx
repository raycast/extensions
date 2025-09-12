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
import ActivateAndBranchForm from "./ActivateAndBranchForm";

const execAsync = promisify(exec);

interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

interface WorkItemDetails {
  id: number;
  fields: {
    "System.Title": string;
    "System.Description"?: string;
    "System.WorkItemType": string;
    "System.State": string;
    "System.Reason"?: string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.CreatedBy"?: {
      displayName: string;
      uniqueName: string;
    };
    "System.TeamProject": string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "System.Tags"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
    "Microsoft.VSTS.Common.Severity"?: string;
    "Microsoft.VSTS.Common.StackRank"?: number;
    "Microsoft.VSTS.Scheduling.Effort"?: number;
    "Microsoft.VSTS.Scheduling.OriginalEstimate"?: number;
    "Microsoft.VSTS.Scheduling.RemainingWork"?: number;
    "Microsoft.VSTS.Scheduling.CompletedWork"?: number;
    "System.BoardColumn"?: string;
    "System.BoardColumnDone"?: boolean;
  };
}

interface Props {
  workItemId: string;
  initialTitle?: string;
}

export default function WorkItemDetailsView({
  workItemId,
  initialTitle,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [workItem, setWorkItem] = useState<WorkItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchWorkItemDetails() {
    setIsLoading(true);
    setError(null);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const azCommand = "/opt/homebrew/bin/az";

      // Fetch detailed work item information
      let fetchCommand = `${azCommand} boards work-item show --id ${workItemId} --output json`;

      if (preferences.azureOrganization) {
        fetchCommand += ` --organization "${preferences.azureOrganization}"`;
      }

      // Note: az boards work-item show doesn't support --project parameter
      // The project is determined from the work item ID itself

      const { stdout: workItemJson } = await execAsync(fetchCommand);
      const workItemData: WorkItemDetails = JSON.parse(workItemJson);

      setWorkItem(workItemData);
    } catch (error) {
      const errorMessage = "Failed to fetch work item details";
      setError(errorMessage);
      await showToast(Toast.Style.Failure, "Error", errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  function getWorkItemUrl(): string {
    if (!workItem) return "";

    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.azureOrganization) return "";

    const projectFromWorkItem = workItem.fields["System.TeamProject"];
    const projectToUse =
      projectFromWorkItem || preferences.azureProject || "Unknown";

    return `${preferences.azureOrganization}/${encodeURIComponent(projectToUse)}/_workitems/edit/${workItem.id}`;
  }

  function getWorkItemTypeIcon(type: string): string {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case "bug":
        return "🐛";
      case "task":
        return "✅";
      case "user story":
      case "story":
        return "👤";
      case "product backlog item":
      case "pbi":
        return "📋";
      case "feature":
        return "⭐";
      case "epic":
        return "👑";
      case "issue":
        return "❗";
      case "test case":
        return "🧪";
      case "test suite":
        return "📁";
      case "test plan":
        return "📄";
      case "requirement":
        return "📝";
      case "code review request":
        return "👁";
      default:
        return "⚪";
    }
  }

  function getStateColor(state: string): string {
    const lowerState = state.toLowerCase();
    switch (lowerState) {
      case "new":
      case "to do":
      case "proposed":
        return "🔵";
      case "active":
      case "in progress":
      case "committed":
      case "approved":
        return "🟠";
      case "resolved":
      case "done":
      case "completed":
        return "🟢";
      case "closed":
      case "removed":
        return "⚪";
      case "blocked":
      case "on hold":
        return "🔴";
      default:
        return "⚫";
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  function generateMarkdown(): string {
    if (!workItem) return "Loading work item details...";

    const preferences = getPreferenceValues<Preferences>();
    const branchName = convertToBranchName(
      workItem.id.toString(),
      workItem.fields["System.Title"],
      preferences.branchPrefix,
    );

    const typeIcon = getWorkItemTypeIcon(
      workItem.fields["System.WorkItemType"],
    );
    const stateColor = getStateColor(workItem.fields["System.State"]);

    let markdown = `# ${typeIcon} ${workItem.fields["System.Title"]}\n\n`;

    // Compact metadata in a horizontal layout
    markdown += `${stateColor} **${workItem.fields["System.State"]}** • `;
    markdown += `#${workItem.id} • `;
    markdown += `${workItem.fields["System.WorkItemType"]} • `;

    if (workItem.fields["System.AssignedTo"]) {
      markdown += `👤 ${workItem.fields["System.AssignedTo"].displayName} • `;
    } else {
      markdown += `👤 Unassigned • `;
    }

    markdown += `📁 ${workItem.fields["System.TeamProject"]}`;

    // Add priority and effort if available
    const importantMetadata = [];
    if (workItem.fields["Microsoft.VSTS.Common.Priority"]) {
      importantMetadata.push(
        `⚡ P${workItem.fields["Microsoft.VSTS.Common.Priority"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.Effort"]) {
      importantMetadata.push(
        `🎯 ${workItem.fields["Microsoft.VSTS.Scheduling.Effort"]}pts`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.RemainingWork"]) {
      importantMetadata.push(
        `⏱️ ${workItem.fields["Microsoft.VSTS.Scheduling.RemainingWork"]}h`,
      );
    }

    if (importantMetadata.length > 0) {
      markdown += ` • ${importantMetadata.join(" • ")}`;
    }

    markdown += `\n\n`;

    // Tags prominently displayed
    if (workItem.fields["System.Tags"]) {
      const tags = workItem.fields["System.Tags"]
        .split(";")
        .map((tag) => tag.trim())
        .filter((tag) => tag);
      markdown += `🏷️ ${tags.map((tag) => `\`${tag}\``).join(" ")} \n\n`;
    }

    // Description (main content)
    if (workItem.fields["System.Description"]) {
      const description = workItem.fields["System.Description"]
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
        .replace(/&amp;/g, "&") // Decode ampersands
        .replace(/&lt;/g, "<") // Decode less-than
        .replace(/&gt;/g, ">") // Decode greater-than
        .replace(/&quot;/g, '"') // Decode quotes
        .trim();

      if (description) {
        markdown += `${description}\n\n`;
      }
    }

    // Compact details section at the bottom
    markdown += `---\n\n`;

    // Create a compact 3-column layout for detailed metadata
    const leftColumn = [];
    const middleColumn = [];
    const rightColumn = [];

    // Left column - Core info
    if (workItem.fields["System.AreaPath"]) {
      leftColumn.push(`**Area:** ${workItem.fields["System.AreaPath"]}`);
    }
    if (workItem.fields["System.IterationPath"]) {
      leftColumn.push(
        `**Iteration:** ${workItem.fields["System.IterationPath"]}`,
      );
    }
    if (workItem.fields["System.BoardColumn"]) {
      leftColumn.push(`**Column:** ${workItem.fields["System.BoardColumn"]}`);
    }
    if (workItem.fields["System.Reason"]) {
      leftColumn.push(`**Reason:** ${workItem.fields["System.Reason"]}`);
    }

    // Middle column - Planning
    if (workItem.fields["Microsoft.VSTS.Common.Severity"]) {
      middleColumn.push(
        `**Severity:** ${workItem.fields["Microsoft.VSTS.Common.Severity"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Common.StackRank"]) {
      middleColumn.push(
        `**Rank:** ${workItem.fields["Microsoft.VSTS.Common.StackRank"]}`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]) {
      middleColumn.push(
        `**Original:** ${workItem.fields["Microsoft.VSTS.Scheduling.OriginalEstimate"]}h`,
      );
    }
    if (workItem.fields["Microsoft.VSTS.Scheduling.CompletedWork"]) {
      middleColumn.push(
        `**Completed:** ${workItem.fields["Microsoft.VSTS.Scheduling.CompletedWork"]}h`,
      );
    }

    // Right column - Dates and people
    if (workItem.fields["System.CreatedBy"]) {
      rightColumn.push(
        `**Created by:** ${workItem.fields["System.CreatedBy"].displayName}`,
      );
    }
    rightColumn.push(
      `**Created:** ${formatDate(workItem.fields["System.CreatedDate"])}`,
    );
    rightColumn.push(
      `**Modified:** ${formatDate(workItem.fields["System.ChangedDate"])}`,
    );

    // Only show detailed metadata if we have any
    if (
      leftColumn.length > 0 ||
      middleColumn.length > 0 ||
      rightColumn.length > 0
    ) {
      // Simple vertical list instead of complex table layout
      const allDetails = [...leftColumn, ...middleColumn, ...rightColumn];
      if (allDetails.length > 0) {
        markdown += `**Details:**  \n`;
        markdown += allDetails.join(" • ");
        markdown += `\n\n`;
      }
    }

    // Suggested Branch Name (compact)
    markdown += `**Branch:** \`${branchName}\`\n\n`;

    return markdown;
  }

  useEffect(() => {
    fetchWorkItemDetails();
  }, [workItemId]);

  const workItemUrl = getWorkItemUrl();
  const preferences = getPreferenceValues<Preferences>();
  const branchName = workItem
    ? convertToBranchName(
        workItem.id.toString(),
        workItem.fields["System.Title"],
        preferences.branchPrefix,
      )
    : "";

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\nWork Item ID: ${workItemId}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={fetchWorkItemDetails}
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
      navigationTitle={initialTitle || `Work Item #${workItemId}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Work Item Actions">
            {workItem && (
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
            )}
            {workItemUrl && (
              <Action.OpenInBrowser
                title="Open in Azure Devops"
                url={workItemUrl}
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {workItem && (
              <>
                <Action.CopyToClipboard
                  title="Copy Work Item ID"
                  content={workItem.id.toString()}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Work Item Title"
                  content={workItem.fields["System.Title"]}
                  icon={Icon.Text}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  content={branchName}
                  icon={Icon.Code}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View Actions">
            <Action
              title="Refresh"
              onAction={fetchWorkItemDetails}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
