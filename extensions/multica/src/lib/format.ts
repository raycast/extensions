import { Color, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { getCredentials } from "./config";
import type {
  ActorType,
  Agent,
  AgentStatus,
  InboxSeverity,
  Issue,
  IssueStatus,
  Member,
  Priority,
  StatusCategory,
  TaskStatus,
  Workspace,
} from "./types";

// Statuses

const BUILT_IN_STATUSES: Record<string, { name: string; category: StatusCategory; icon: Image.ImageLike }> = {
  backlog: {
    name: "Backlog",
    category: "unstarted",
    icon: { source: Icon.CircleEllipsis, tintColor: Color.SecondaryText },
  },
  todo: { name: "Todo", category: "unstarted", icon: { source: Icon.Circle, tintColor: Color.PrimaryText } },
  in_progress: {
    name: "In Progress",
    category: "started",
    icon: { source: Icon.CircleProgress50, tintColor: Color.Yellow },
  },
  in_review: {
    name: "In Review",
    category: "started",
    icon: { source: Icon.CircleProgress75, tintColor: Color.Green },
  },
  blocked: { name: "Blocked", category: "started", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } },
  done: { name: "Done", category: "done", icon: { source: Icon.CheckCircle, tintColor: Color.Blue } },
  cancelled: {
    name: "Cancelled",
    category: "closed",
    icon: { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
  },
};

const CATEGORY_ICONS: Record<StatusCategory, Icon> = {
  unstarted: Icon.Circle,
  started: Icon.CircleProgress50,
  done: Icon.CheckCircle,
  closed: Icon.XMarkCircle,
};

export const BUILT_IN_STATUS_ORDER = Object.keys(BUILT_IN_STATUSES);

/** The workspace's statuses, falling back to the built-ins until they load. */
export function statusOptions(statuses: IssueStatus[] | undefined): { key: string; name: string }[] {
  const active = statuses?.filter((s) => !s.archived_at).sort((a, b) => a.position - b.position);
  if (active?.length) return active.map((s) => ({ key: s.key, name: s.name }));
  return BUILT_IN_STATUS_ORDER.map((key) => ({ key, name: BUILT_IN_STATUSES[key].name }));
}

export function statusName(key: string, statuses?: IssueStatus[]): string {
  return statuses?.find((s) => s.key === key)?.name ?? BUILT_IN_STATUSES[key]?.name ?? key;
}

export function statusIcon(key: string, statuses?: IssueStatus[]): Image.ImageLike {
  const builtIn = BUILT_IN_STATUSES[key];
  if (builtIn) return builtIn.icon;
  const custom = statuses?.find((s) => s.key === key);
  const source = CATEGORY_ICONS[custom?.category ?? "unstarted"];
  return { source, tintColor: custom?.color?.startsWith("#") ? custom.color : Color.SecondaryText };
}

export function statusRank(key: string, statuses?: IssueStatus[]): number {
  const custom = statuses?.find((s) => s.key === key);
  if (custom) return custom.position;
  const index = BUILT_IN_STATUS_ORDER.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

// Priority

export const PRIORITIES: { value: Priority; name: string; icon: Image.ImageLike }[] = [
  { value: "urgent", name: "Urgent", icon: { source: Icon.Exclamationmark3, tintColor: Color.Red } },
  { value: "high", name: "High", icon: { source: Icon.FullSignal, tintColor: Color.Orange } },
  { value: "medium", name: "Medium", icon: { source: Icon.Signal2, tintColor: Color.Yellow } },
  { value: "low", name: "Low", icon: { source: Icon.Signal1, tintColor: Color.Blue } },
  { value: "none", name: "No Priority", icon: { source: Icon.Minus, tintColor: Color.SecondaryText } },
];

export function priorityInfo(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[PRIORITIES.length - 1];
}

// Actors

export interface Directory {
  members?: Member[];
  agents?: Agent[];
}

export function actorName(
  type: ActorType | "system" | null | undefined,
  id: string | null | undefined,
  dir: Directory,
) {
  if (!type || !id) return undefined;
  if (type === "member") return dir.members?.find((m) => m.user_id === id)?.name ?? "Member";
  if (type === "agent") return dir.agents?.find((a) => a.id === id)?.name ?? "Agent";
  if (type === "squad") return "Squad";
  return "Multica";
}

const AVATAR_EMOJI_PREFIX = "emoji:";

/**
 * Turns an `avatar_url` into an icon. Multica stores emoji avatars (the default
 * for new agents) as `emoji:<emoji>`, which Raycast can render as-is.
 */
export function avatarIcon(
  avatarUrl: string | null | undefined,
  mask: Image.Mask = Image.Mask.Circle,
): Image.ImageLike | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith(AVATAR_EMOJI_PREFIX)) return avatarUrl.slice(AVATAR_EMOJI_PREFIX.length).trim() || undefined;
  return { source: avatarUrl, mask };
}

export function actorIcon(
  type: ActorType | "system" | null | undefined,
  id: string | null | undefined,
  dir: Directory,
): Image.ImageLike {
  if (type === "agent") {
    const agent = dir.agents?.find((a) => a.id === id);
    return avatarIcon(agent?.avatar_url) ?? { source: Icon.Stars, tintColor: Color.Purple };
  }
  if (type === "member") {
    const member = dir.members?.find((m) => m.user_id === id);
    return avatarIcon(member?.avatar_url) ?? getAvatarIcon(member?.name ?? "?");
  }
  return Icon.PersonCircle;
}

// Agents & tasks

export const AGENT_STATUS: Record<AgentStatus, { name: string; color: Color }> = {
  idle: { name: "Idle", color: Color.Green },
  working: { name: "Working", color: Color.Blue },
  blocked: { name: "Blocked", color: Color.Orange },
  error: { name: "Error", color: Color.Red },
  offline: { name: "Offline", color: Color.SecondaryText },
};

export const TASK_STATUS: Record<TaskStatus, { name: string; icon: Image.ImageLike }> = {
  queued: { name: "Queued", icon: { source: Icon.Clock, tintColor: Color.SecondaryText } },
  dispatched: { name: "Dispatched", icon: { source: Icon.Clock, tintColor: Color.Blue } },
  running: { name: "Running", icon: { source: Icon.CircleProgress50, tintColor: Color.Blue } },
  waiting_local_directory: { name: "Waiting", icon: { source: Icon.Hourglass, tintColor: Color.Orange } },
  deferred: { name: "Deferred", icon: { source: Icon.Hourglass, tintColor: Color.SecondaryText } },
  completed: { name: "Completed", icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
  failed: { name: "Failed", icon: { source: Icon.XMarkCircle, tintColor: Color.Red } },
  cancelled: { name: "Cancelled", icon: { source: Icon.MinusCircle, tintColor: Color.SecondaryText } },
};

// Inbox

export const INBOX_SEVERITY: Record<InboxSeverity, { name: string; color: Color }> = {
  action_required: { name: "Action Required", color: Color.Red },
  attention: { name: "Attention", color: Color.Orange },
  info: { name: "Info", color: Color.Blue },
};

// URLs

export function webUrl(workspace: Workspace, ...segments: string[]): string {
  return [getCredentials().appUrl, workspace.slug, ...segments.map(encodeURIComponent)].join("/");
}

export const issueUrl = (workspace: Workspace, issue: Pick<Issue, "identifier">) =>
  webUrl(workspace, "issues", issue.identifier);
