import { getPreferenceValues, Color, Icon } from "@raycast/api";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// URL helpers
export function getAdminUrl(path = ""): string {
  const { siteUrl } = getPreferenceValues();
  return `${siteUrl.replace(/\/$/, "")}/wp-admin/${path}`;
}

export function getEditPostUrl(postId: number): string {
  return getAdminUrl(`post.php?post=${postId}&action=edit`);
}

export function getEditPageUrl(pageId: number): string {
  return getAdminUrl(`post.php?post=${pageId}&action=edit`);
}

export function getEditCommentUrl(commentId: number): string {
  return getAdminUrl(`comment.php?action=editcomment&c=${commentId}`);
}

export function getEditMediaUrl(mediaId: number): string {
  return getAdminUrl(`upload.php?item=${mediaId}`);
}

export function getEditUserUrl(userId: number): string {
  return getAdminUrl(`user-edit.php?user_id=${userId}`);
}

export function getNewPostUrl(): string {
  return getAdminUrl("post-new.php");
}

export function getNewPageUrl(): string {
  return getAdminUrl("post-new.php?post_type=page");
}

// Date formatting
export function formatDate(dateString: string, formatStr = "MMM d, yyyy"): string {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  return formatDate(dateString, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

// Text helpers
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, maxLength = 100): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength).trim() + "...";
}

export function getTitle(item: { title: { rendered: string; raw?: string } }): string {
  return stripHtml(item.title.raw || item.title.rendered) || "(no title)";
}

// Status helpers
export function getStatusIcon(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "publish":
    case "approved":
    case "active":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "draft":
    case "hold":
      return { source: Icon.Circle, tintColor: Color.Orange };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Yellow };
    case "private":
      return { source: Icon.Lock, tintColor: Color.Purple };
    case "future":
      return { source: Icon.Calendar, tintColor: Color.Blue };
    case "trash":
    case "spam":
      return { source: Icon.Trash, tintColor: Color.Red };
    case "inactive":
      return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    publish: "Published",
    draft: "Draft",
    pending: "Pending Review",
    private: "Private",
    future: "Scheduled",
    trash: "Trashed",
    approved: "Approved",
    hold: "Pending",
    spam: "Spam",
    active: "Active",
    inactive: "Inactive",
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

// Media helpers
export function getMediaTypeIcon(mediaType: string): Icon {
  switch (mediaType) {
    case "image":
      return Icon.Image;
    case "video":
      return Icon.Video;
    case "audio":
      return Icon.Music;
    default:
      return Icon.Document;
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// User helpers
export function getRoleColor(role?: string): Color {
  switch (role) {
    case "administrator":
      return Color.Red;
    case "editor":
      return Color.Orange;
    case "author":
      return Color.Blue;
    case "contributor":
      return Color.Green;
    case "subscriber":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}

export function getRoleLabel(role?: string): string {
  if (!role) return "Unknown";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// Featured image helper
export function getFeaturedImageUrl(post: {
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      media_details?: { sizes?: { thumbnail?: { source_url: string } } };
    }>;
  };
}): string | undefined {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return undefined;

  // Prefer thumbnail for list views
  return media.media_details?.sizes?.thumbnail?.source_url || media.source_url;
}

// Category/Tag helpers
export function getTermNames(
  post: { _embedded?: { "wp:term"?: Array<Array<{ name: string }>> } },
  taxonomy: "category" | "post_tag"
): string[] {
  const terms = post._embedded?.["wp:term"];
  if (!terms) return [];

  const index = taxonomy === "category" ? 0 : 1;
  return terms[index]?.map((term) => term.name) || [];
}

// Author helper
export function getAuthorName(item: { _embedded?: { author?: Array<{ name: string }> } }): string {
  return item._embedded?.author?.[0]?.name || "Unknown";
}
