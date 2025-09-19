import { getPreferenceValues } from "@raycast/api";
import {
  WorkItemDetails,
  WorkItemRelationsData,
  Preferences,
} from "../types/work-item";
import { WorkItemComment } from "../azure-devops";
import { getWorkItemTypeIcon } from "./WorkItemMetadata";

interface WorkItemRelationsProps {
  workItem: WorkItemDetails;
  relations: WorkItemRelationsData;
  isLoadingRelations: boolean;
  comments: WorkItemComment[];
  isLoadingComments: boolean;
}

interface RelatedWorkItem {
  id: number;
  title: string;
  type?: string;
  teamProject?: string;
  state?: string;
}

export function generateRelationsMarkdown({
  workItem,
  relations,
  isLoadingRelations,
  comments,
  isLoadingComments,
}: WorkItemRelationsProps): string {
  let markdown = `---\n\n`;

  const org = getPreferenceValues<Preferences>().azureOrganization;
  const currentProject = workItem.fields["System.TeamProject"];

  const makeLink = (id: number, title: string, teamProject?: string) => {
    if (!org) return `#${id} ${title}`;
    const project = teamProject || currentProject;
    const url = `${org}/${encodeURIComponent(project)}/_workitems/edit/${id}`;
    const safeTitle = title || "Untitled";
    return `[#${id} ${safeTitle}](${url})`;
  };

  if (isLoadingRelations) {
    markdown += `Loading related work items...\n`;
  } else {
    const lines: string[] = [];

    // Parent section on its own line
    if (relations.parentItem) {
      const pIcon = getWorkItemTypeIcon(relations.parentItem.type || "");
      lines.push(`Parent:`);
      const parentItem = relations.parentItem as RelatedWorkItem;
      lines.push(
        `- ${pIcon} ${makeLink(parentItem.id, parentItem.title, parentItem.teamProject)}${parentItem.state ? ` • ${parentItem.state}` : ""}`,
      );
      lines.push(""); // blank line
    }

    // Siblings
    if (relations.siblingItems.length) {
      lines.push("Siblings:");
      relations.siblingItems.forEach((s) => {
        const sibling = s as RelatedWorkItem;
        const sIcon = getWorkItemTypeIcon(sibling.type || "");
        lines.push(
          `- ${sIcon} ${makeLink(sibling.id, sibling.title, sibling.teamProject)}${sibling.state ? ` • ${sibling.state}` : ""}`,
        );
      });
      lines.push("");
    }

    // Children
    if (relations.childItems.length) {
      lines.push("Children:");
      relations.childItems.forEach((c) => {
        const child = c as RelatedWorkItem;
        const cIcon = getWorkItemTypeIcon(child.type || "");
        lines.push(
          `- ${cIcon} ${makeLink(child.id, child.title, child.teamProject)}${child.state ? ` • ${child.state}` : ""}`,
        );
      });
      lines.push("");
    }

    // Related
    if (relations.relatedItems.length) {
      lines.push("Related:");
      relations.relatedItems.forEach((r) => {
        const related = r as RelatedWorkItem;
        const rIcon = getWorkItemTypeIcon(related.type || "");
        lines.push(
          `- ${rIcon} ${makeLink(related.id, related.title, related.teamProject)}${related.state ? ` • ${related.state}` : ""}`,
        );
      });
      lines.push("");
    }

    if (lines.length) {
      markdown += lines.join("\n") + "\n";
    } else {
      markdown += "No related items found.\n";
    }
  }

  // Comments section
  markdown += `---\n\n`;

  if (isLoadingComments) {
    markdown += `Loading comments...\n`;
  } else if (comments.length > 0) {
    markdown += `## Comments (${comments.length})\n\n`;

    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort(
      (a, b) =>
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
    );

    // Show only the 3 most recent comments to keep the view concise
    const recentComments = sortedComments.slice(0, 3);

    recentComments.forEach((comment) => {
      const date = new Date(comment.createdDate).toLocaleDateString();
      const time = new Date(comment.createdDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      markdown += `**${comment.createdBy.displayName}** - ${date} at ${time}\n`;

      // Clean and format comment text
      const cleanText = comment.text
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
        .replace(/&amp;/g, "&") // Decode ampersands
        .replace(/&lt;/g, "<") // Decode less-than
        .replace(/&gt;/g, ">") // Decode greater-than
        .replace(/&quot;/g, '"') // Decode quotes
        .trim();

      markdown += `> ${cleanText}\n\n`;
    });

    if (comments.length > 3) {
      markdown += `*... and ${comments.length - 3} more comments*\n\n`;
    }
  } else {
    markdown += `## Comments\n\nNo comments yet.\n\n`;
  }

  return markdown;
}
