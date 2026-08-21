import type {
  ClosedBadge,
  SortOrder,
  TicketParticipantRole,
  TicketPriority,
  TicketSortBy,
  TicketStatus,
  TicketType,
} from "../domain/enums";
import type { CreateTicketInput, Ticket, TicketAction, TicketComment, TicketParticipant } from "../domain/ticket";
import { requestOne, requestPage } from "./client";
import type { Page } from "./envelope";

export interface ListTicketsParams {
  currentPage?: number;
  pageSize?: number;
  sortBy?: TicketSortBy;
  sortOrder?: SortOrder;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  owningDepartmentId?: string;
  assignedUserId?: string;
  participantUserId?: string;
  creatorUserId?: string;
  projectId?: string;
  sprintId?: string;
  search?: string;
}

export function listTickets(params: ListTicketsParams): Promise<Page<Ticket>> {
  return requestPage<Ticket>({ path: "/tickets", query: { ...params } });
}

export function getTicket(ticketId: string): Promise<Ticket> {
  return requestOne<Ticket>({ path: `/tickets/${ticketId}` });
}

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return requestOne<Ticket>({ method: "POST", path: "/tickets", body: input });
}

export function listComments(ticketId: string): Promise<TicketComment[]> {
  return requestOne<TicketComment[]>({ path: `/tickets/${ticketId}/comments` });
}

export function addComment(ticketId: string, body: string, isInternal = false): Promise<TicketComment> {
  return requestOne<TicketComment>({
    method: "POST",
    path: `/tickets/${ticketId}/comments`,
    body: { body, isInternal },
  });
}

export function listActions(ticketId: string): Promise<TicketAction[]> {
  return requestOne<TicketAction[]>({ path: `/tickets/${ticketId}/actions` });
}

export function transitionTicket(
  ticketId: string,
  toStatus: Extract<TicketStatus, "IN_PROGRESS" | "CLOSED">,
  remark?: string,
): Promise<Ticket> {
  return requestOne<Ticket>({
    method: "POST",
    path: `/tickets/${ticketId}/transitions`,
    body: { toStatus, remark },
  });
}

export function setAssignee(ticketId: string, userId: string): Promise<Ticket> {
  return requestOne<Ticket>({
    method: "PUT",
    path: `/tickets/${ticketId}/assignee`,
    body: { userId },
  });
}

export function addParticipant(
  ticketId: string,
  userId: string,
  role: TicketParticipantRole,
): Promise<TicketParticipant> {
  return requestOne<TicketParticipant>({
    method: "POST",
    path: `/tickets/${ticketId}/participants`,
    body: { userId, role },
  });
}

export type ReviewResult = Ticket & { promptRelativeTicket?: boolean };

export function reviewTicket(
  ticketId: string,
  verdict: Extract<ClosedBadge, "VERIFIED" | "REJECTED">,
  remark?: string,
): Promise<ReviewResult> {
  return requestOne<ReviewResult>({
    method: "POST",
    path: `/tickets/${ticketId}/review`,
    body: { verdict, remark },
  });
}
