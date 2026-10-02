import type { TicketParticipantRole, TicketStatus } from "./enums";
import type { Ticket } from "./ticket";

const HANDLING_ROLES = new Set<TicketParticipantRole>(["ASSIGNEE", "MANAGER", "PMO", "PM"]);
const OVERSIGHT_ROLES = new Set<TicketParticipantRole>(["MANAGER", "PMO", "PM"]);
const REVIEW_ROLES = new Set<TicketParticipantRole>(["REVIEWER", "MANAGER", "PMO", "PM"]);

const ADMIN_ROLES = new Set(["ADMIN", "ROOT_ADMIN"]);

export interface TicketPermissions {
  canStartProgress: boolean;
  canClose: boolean;
  canAssign: boolean;
  canEdit: boolean;
  canComment: boolean;
  canUseInternalNotes: boolean;
  canReview: boolean;
}

export interface PermissionSubject {
  status: TicketStatus;
  closedBadge: string | null;
  viewerRoles: TicketParticipantRole[];
  isAdmin: boolean;
  isCreator: boolean;
}

export function resolveTicketPermissions(subject: PermissionSubject): TicketPermissions {
  const { status, closedBadge, viewerRoles, isAdmin, isCreator } = subject;

  const isAssignee = viewerRoles.includes("ASSIGNEE");
  const hasOversight = viewerRoles.some((role) => OVERSIGHT_ROLES.has(role)) || isAdmin;
  const canHandle = viewerRoles.some((role) => HANDLING_ROLES.has(role)) || isAdmin;

  const canClose =
    status === "IN_PROGRESS" ? canHandle || isCreator : status === "OPEN" ? hasOversight || isCreator : false;

  return {
    canAssign: hasOversight,
    canClose,
    canComment: status !== "CLOSED",
    canEdit: status !== "CLOSED" && (hasOversight || isCreator),
    canReview:
      status === "CLOSED" &&
      closedBadge === "UNVERIFIED" &&
      (isAdmin || viewerRoles.some((role) => REVIEW_ROLES.has(role))),
    canStartProgress: status === "OPEN" && (isAssignee || isAdmin),
    canUseInternalNotes: canHandle,
  };
}

export function permissionsForTicket(
  ticket: Ticket,
  subjectUserId: string | undefined,
  role: string | undefined,
): TicketPermissions {
  const viewerRoles = subjectUserId
    ? ticket.participants.filter((p) => p.userId === subjectUserId).map((p) => p.role)
    : [];

  return resolveTicketPermissions({
    status: ticket.status,
    closedBadge: ticket.closedBadge,
    viewerRoles,
    isAdmin: role ? ADMIN_ROLES.has(role) : false,
    isCreator: Boolean(subjectUserId) && ticket.creatorUserId === subjectUserId,
  });
}
