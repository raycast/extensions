import type { ActionItem } from "../types/Types";

/**
 * Builds markdown for action items list
 * @param actionItems - Array of action items to render
 * @param options - Rendering options
 * @param options.grouped - If true, groups items by status (Pending/Completed). If false, shows flat list.
 * @param options.showHeader - If true, includes "# Action Items" header
 */
export function buildActionItemsMarkdown(
  actionItems: ActionItem[],
  options: { grouped?: boolean; showHeader?: boolean } = {},
): string {
  if (!actionItems || actionItems.length === 0) {
    return options.showHeader ? "# No Action Items\n\nNo action items found for this meeting." : "";
  }

  const { grouped = false, showHeader = false } = options;

  let markdown = showHeader ? "# Action Items\n\n" : "";

  if (grouped) {
    // Group by completion status
    const pending = actionItems.filter((item) => !item.completed);
    const completed = actionItems.filter((item) => item.completed);

    if (pending.length > 0) {
      markdown += "## Pending\n\n";
      pending.forEach((item) => {
        markdown += formatActionItem(item, false);
      });
    }

    if (completed.length > 0) {
      markdown += "## Completed\n\n";
      completed.forEach((item) => {
        markdown += formatActionItem(item, true);
      });
    }
  } else {
    // Flat list
    actionItems.forEach((item) => {
      markdown += formatActionItem(item, item.completed);
    });
  }

  return markdown;
}

/**
 * Formats a single action item as markdown
 * Matches Fathom's website style: checkbox, bold description, AI badge, timestamp link, assignee
 */
function formatActionItem(item: ActionItem, isCompleted: boolean): string {
  const checkbox = isCompleted ? "[x]" : "[ ]";
  const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";

  // AI-generated badge (sparkles emoji) - shown when NOT user generated
  const aiBadge = !item.userGenerated ? " ✨" : "";

  // Build the single-line format: checkbox + bold description + AI badge + timestamp link + assignee
  let markdown = `- ${checkbox} **${item.description.trim()}**${aiBadge}`;

  // Add timestamp link
  if (item.recordingPlaybackUrl) {
    markdown += ` [@ ${item.recordingTimestamp}](${item.recordingPlaybackUrl})`;
  } else {
    markdown += ` @ ${item.recordingTimestamp}`;
  }

  // Add assignee
  markdown += ` 👤 ${assigneeText}\n`;

  return markdown;
}

/**
 * Builds copy-friendly text for action items
 */
export function buildActionItemsCopyText(actionItems: ActionItem[]): string {
  if (!actionItems || actionItems.length === 0) {
    return "";
  }

  return actionItems
    .map((item, index) => {
      const checkbox = item.completed ? "[x]" : "[ ]";
      const assigneeText = item.assignee.name || item.assignee.email || "Unassigned";
      return `${index + 1}. ${checkbox} ${item.description} - ${assigneeText} (${item.recordingTimestamp})`;
    })
    .join("\n");
}
