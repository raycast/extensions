/** Presentation helpers shared by the list, detail, and menu bar views. */
import { Color, Icon, type Image } from "@raycast/api";

import type { StalenessLevel } from "./aging";
import type { PullRequest } from "./types";

/** A compact relative time, e.g. "3m", "5h", "2d", "6w". */
export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks}w`;
  return `${Math.round(days / 30)}mo`;
}

/** An absolute timestamp for detail metadata. */
export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** A GitHub avatar for a login, falling back to a generic person icon. */
export function avatar(login: string): Image.ImageLike {
  if (!login) return Icon.Person;
  return { source: `https://github.com/${login}.png?size=64`, mask: "circle" as Image.Mask };
}

/** The status icon for a PR: draft, approved, changes requested, or open. */
export function statusIcon(pr: PullRequest): { value: Icon; tooltip: string; tintColor: Color } {
  if (pr.isDraft) {
    return { value: Icon.CircleProgress25, tooltip: "Draft", tintColor: Color.SecondaryText };
  }
  switch (pr.reviewDecision) {
    case "APPROVED":
      return { value: Icon.CheckCircle, tooltip: "Approved", tintColor: Color.Green };
    case "CHANGES_REQUESTED":
      return { value: Icon.XMarkCircle, tooltip: "Changes requested", tintColor: Color.Red };
    case "REVIEW_REQUIRED":
      return { value: Icon.Circle, tooltip: "Review required", tintColor: Color.Yellow };
    default:
      return { value: Icon.Circle, tooltip: "Open", tintColor: Color.PrimaryText };
  }
}

/** A short, human label for the review decision. */
export function reviewDecisionLabel(decision: string): string {
  switch (decision) {
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "REVIEW_REQUIRED":
      return "Review required";
    default:
      return "No decision yet";
  }
}

/** A readable label for a normalized timeline event kind. */
export function timelineLabel(kind: string): string {
  const labels: Record<string, string> = {
    opened: "opened this pull request",
    comment: "commented",
    "review-approved": "approved",
    "review-changes": "requested changes",
    "review-dismissed": "had a review dismissed",
    "review-commented": "reviewed",
    "review-requested": "requested a review from",
    ready: "marked ready for review",
    draft: "converted to draft",
    "force-push": "force-pushed",
    merged: "merged",
    closed: "closed",
    reopened: "reopened",
    label: "added the label",
    rename: "renamed to",
  };
  return labels[kind] ?? kind;
}

/** An emoji marker for a timeline event kind, for the markdown timeline. */
export function timelineEmoji(kind: string): string {
  const emoji: Record<string, string> = {
    opened: "🚀",
    comment: "💬",
    "review-approved": "✅",
    "review-changes": "❌",
    "review-dismissed": "🚫",
    "review-commented": "👀",
    "review-requested": "🙋",
    ready: "📢",
    draft: "📝",
    "force-push": "⚡",
    merged: "🎉",
    closed: "🔒",
    reopened: "🔓",
    label: "🏷️",
    rename: "✏️",
  };
  return emoji[kind] ?? "•";
}

/** The icon and tint for a timeline event kind, mirroring the web dashboard's nodes. */
export function timelineIcon(kind: string): { source: Icon; tintColor: Color } {
  const icons: Record<string, { source: Icon; tintColor: Color }> = {
    opened: { source: Icon.Rocket, tintColor: Color.Green },
    comment: { source: Icon.SpeechBubble, tintColor: Color.Blue },
    "review-approved": { source: Icon.CheckCircle, tintColor: Color.Green },
    "review-changes": { source: Icon.XMarkCircle, tintColor: Color.Red },
    "review-dismissed": { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
    "review-commented": { source: Icon.Eye, tintColor: Color.Blue },
    "review-requested": { source: Icon.PersonCircle, tintColor: Color.Orange },
    ready: { source: Icon.Megaphone, tintColor: Color.Green },
    draft: { source: Icon.Pencil, tintColor: Color.SecondaryText },
    "force-push": { source: Icon.Bolt, tintColor: Color.Yellow },
    merged: { source: Icon.Checkmark, tintColor: Color.Purple },
    closed: { source: Icon.Lock, tintColor: Color.Red },
    reopened: { source: Icon.LockUnlocked, tintColor: Color.Green },
    label: { source: Icon.Tag, tintColor: Color.Yellow },
    rename: { source: Icon.Text, tintColor: Color.SecondaryText },
  };
  return icons[kind] ?? { source: Icon.Dot, tintColor: Color.SecondaryText };
}

/** The calendar day an event falls on, used to group the timeline. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** The clock time of an event, e.g. "14:32". */
export function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** How a staleness band is labelled and coloured wherever it appears. */
export function stalenessStyle(level: StalenessLevel): { label: string; color: Color } {
  switch (level) {
    case "stalled":
      return { label: "stalled", color: Color.Red };
    case "stale":
      return { label: "stale", color: Color.Orange };
    case "aging":
      return { label: "aging", color: Color.Yellow };
    case "fresh":
      return { label: "fresh", color: Color.Green };
  }
}

/** "+120 −34" for the diff size. */
export function diffStat(pr: PullRequest): string {
  return `+${pr.additions} −${pr.deletions}`;
}
