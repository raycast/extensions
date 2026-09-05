export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED", "BLOCKED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["NORMAL", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_TYPES = [
  "BUG",
  "FEATURE",
  "ENHANCEMENT",
  "HR_ISSUE",
  "OPERATIONS_ISSUE",
  "FINANCE_ISSUE",
  "ADMIN_ISSUE",
  "SALES_ISSUE",
  "GENERAL_SUPPORT",
] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const CLOSED_BADGES = ["UNVERIFIED", "VERIFIED", "REJECTED"] as const;
export type ClosedBadge = (typeof CLOSED_BADGES)[number];

export const PARTICIPANT_ROLES = ["ASSIGNEE", "MANAGER", "PMO", "PM", "OBSERVER", "REVIEWER"] as const;
export type TicketParticipantRole = (typeof PARTICIPANT_ROLES)[number];

export type TicketParticipantSource = "AUTO" | "MANUAL";

export type TicketActionType =
  | "CREATED"
  | "UPDATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "STARTED"
  | "CLOSED"
  | "COMMENT_ADDED"
  | "RELATIVE_CREATED"
  | "ESCALATED"
  | "REVIEW_REQUESTED"
  | "VERIFIED"
  | "REJECTED"
  | "BLOCKED"
  | "UNBLOCKED";

export type TicketRelationType = "CONTINUATION" | "CORRECTION";

export const TICKET_SORT_FIELDS = ["createdAt", "updatedAt", "title", "ticketNumber", "priority", "status"] as const;
export type TicketSortBy = (typeof TICKET_SORT_FIELDS)[number];

export type SortOrder = "ASC" | "DESC";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
  BLOCKED: "Blocked",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  NORMAL: "Normal",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const TYPE_LABELS: Record<TicketType, string> = {
  BUG: "Bug",
  FEATURE: "Feature",
  ENHANCEMENT: "Enhancement",
  HR_ISSUE: "HR Issue",
  OPERATIONS_ISSUE: "Operations Issue",
  FINANCE_ISSUE: "Finance Issue",
  ADMIN_ISSUE: "Admin Issue",
  SALES_ISSUE: "Sales Issue",
  GENERAL_SUPPORT: "General Support",
};

export const CLOSED_BADGE_LABELS: Record<ClosedBadge, string> = {
  UNVERIFIED: "Unverified",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const PARTICIPANT_ROLE_LABELS: Record<TicketParticipantRole, string> = {
  ASSIGNEE: "Assignee",
  MANAGER: "Manager",
  PMO: "PMO",
  PM: "Project Manager",
  OBSERVER: "Observer",
  REVIEWER: "Reviewer",
};

export const ACTION_TYPE_LABELS: Record<TicketActionType, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  ASSIGNED: "Assigned",
  UNASSIGNED: "Unassigned",
  STARTED: "Started",
  CLOSED: "Closed",
  COMMENT_ADDED: "Commented",
  RELATIVE_CREATED: "Relative Created",
  ESCALATED: "Escalated",
  REVIEW_REQUESTED: "Review Requested",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  BLOCKED: "Blocked",
  UNBLOCKED: "Unblocked",
};

export const SYSTEM_ACTOR_USER_ID = "00000000-0000-0000-0000-000000000000";
