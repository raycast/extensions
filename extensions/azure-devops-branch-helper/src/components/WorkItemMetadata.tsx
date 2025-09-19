import { getPreferenceValues } from "@raycast/api";
import { WorkItemDetails, Preferences } from "../types/work-item";
import { convertToBranchName } from "../azure-devops";

interface WorkItemMetadataProps {
  workItem: WorkItemDetails;
  commentsCount: number | null;
  relatedBranches: string[];
}

export function getWorkItemTypeIcon(type: string): string {
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

export function getStateColor(state: string): string {
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

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function cleanDescription(desc?: string): string {
  if (!desc) return "";
  return desc
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+$/g, "")
    .trim();
}

export function generateWorkItemMarkdown({
  workItem,
  commentsCount,
  relatedBranches,
}: WorkItemMetadataProps): string {
  const preferences = getPreferenceValues<Preferences>();
  const branchName = convertToBranchName(
    workItem.id.toString(),
    workItem.fields["System.Title"],
    preferences.branchPrefix,
  );

  const typeIcon = getWorkItemTypeIcon(workItem.fields["System.WorkItemType"]);
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
  if (commentsCount !== null) {
    markdown += ` • 💬 ${commentsCount}`;
  }

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

  // Branch info — prefer showing any existing remote branches regardless of owner
  if (relatedBranches.length > 0) {
    const shown = relatedBranches
      .slice(0, 2)
      .map((b) => `\`${b}\``)
      .join(", ");
    const extra =
      relatedBranches.length > 2
        ? ` (+${relatedBranches.length - 2} more)`
        : "";
    markdown += `**Active Branch${relatedBranches.length > 1 ? "es" : ""}:** ${shown}${extra}\n\n`;
  } else {
    // Suggested Branch Name (fallback)
    markdown += `**Branch:** \`${branchName}\`\n\n`;
  }

  return markdown;
}
