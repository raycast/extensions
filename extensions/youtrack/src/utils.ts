import type { DurationPresentation } from "youtrack-client";
import type { Comment, CustomField, EnumValue, Issue, IssueExtended, IssueTag, Project } from "./interfaces";

type PreparedFavorites = { cached: Project[]; toFetch: string[] };
export function getEmptyIssue(): Issue {
  return {
    id: "",
    summary: "Connecting to YouTrack...",
    date: "",
    created: "",
    description: "",
    resolved: false,
    project: null,
    customFields: [],
  };
}

export const issueStates = {
  ISSUE_RESOLVED: "Resolved",
  ISSUE_OPEN: "Open",
};

export function isURL(s: string) {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function addMarkdownImages(entity: IssueExtended | Comment, host: string) {
  const imagePattern = /!\[[^\]]*\]\(([^)]+)\)(?:\[([^\]]*)\])?(?:\{[^}]*\})?/g;
  const content = "description" in entity ? entity.description : entity.text;

  return content.replace(imagePattern, (match, attachmentPath, linkUrl) => {
    // Clean path and find attachment
    const cleanPath = attachmentPath.replace(/\{[^}]*\}/g, "");
    const attachmentName = cleanPath.split("/").pop();
    const attachment = entity.attachments?.find((a) => a.name === attachmentName);

    if (!attachment) return match;

    // Return formatted markdown with optional URL reference
    const imgMarkdown = `![${attachment.name}](${host}${attachment.url})`;
    return linkUrl ? `${imgMarkdown}[${linkUrl}]` : imgMarkdown;
  });
}

export function prepareFavorites(cachedProjects: Project[], favorites: string[]): PreparedFavorites {
  return favorites.reduce<PreparedFavorites>(
    (acc, projectId) => {
      const cached = cachedProjects.find(({ shortName }) => shortName === projectId);
      if (cached) {
        acc.cached.push(cached);
      } else {
        acc.toFetch.push(projectId);
      }
      return acc;
    },
    { cached: [], toFetch: [] },
  );
}

export function getTagsToAdd(tagsToAdd: string[], stateTags: IssueTag[]): IssueTag[] {
  return tagsToAdd
    .map((tag) => stateTags.find((t) => t.name === tag))
    .filter((tag): tag is IssueTag => tag !== undefined);
}

export function formatDate(dateString: number): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "medium" }).format(date);
}

export function isDurationValid(duration: string): boolean {
  if (!/\d/.test(duration)) {
    return false;
  }
  return /^\s*(?:\d+\s*w)?(?:\s*\d+\s*d)?(?:\s*\d+\s*h)?(?:\s*\d+\s*m)?\s*$/.test(duration);
}

export function isDurationValue(duration: string): duration is DurationPresentation {
  return isDurationValid(duration);
}

export function stripHtmlTags(html: string | null | undefined) {
  return html ? html.replace(/<[^>]*>/g, "") : "";
}

export function transformCustomFieldValue(
  value: unknown,
):
  | string
  | number
  | { id: string; name: string; color: { background: string | null; foreground: string | null } | null } {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    // Check if it already has the complete structure
    if ("name" in value && "color" in value) {
      return value as {
        id: string;
        name: string;
        color: { background: string | null; foreground: string | null } | null;
      };
    }

    // Transform partial object to complete structure
    if ("name" in value) {
      return {
        id: "id" in value ? String(value.id) : "",
        name: String(value.name || ""),
        color: null,
      };
    }
  }

  return "";
}

export function getPriorityFieldValue(customFields: CustomField[]): EnumValue | null {
  const priority = customFields.find((field) => field.name === "Priority");
  if (priority && typeof priority.value === "object" && "name" in priority.value && "color" in priority.value) {
    return priority.value;
  }
  return null;
}

export function getUserAvatar(avatarUrl: string, host: string): string {
  return isURL(avatarUrl) ? avatarUrl : `${host}${avatarUrl}`;
}
