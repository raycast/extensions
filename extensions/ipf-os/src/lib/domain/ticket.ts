import type {
  ClosedBadge,
  TicketActionType,
  TicketParticipantRole,
  TicketParticipantSource,
  TicketPriority,
  TicketRelationType,
  TicketStatus,
  TicketType,
} from "./enums";

export interface TicketParticipant {
  id: string;
  ticketId: string;
  userId: string;
  role: TicketParticipantRole;
  source: TicketParticipantSource;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string | null;
  status: string | null;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  revised: boolean;
  needsResponse: boolean;
  escalated: boolean;
  creatorUserId: string;
  owningDepartmentId: string;
  projectId: string | null;
  parentId: string | null;
  rootId: string | null;
  blockerId: string | null;
  sprintId: string | null;
  relationType: TicketRelationType | null;
  closedBadge: ClosedBadge | null;
  slaDueAt: string | null;
  dueDate: string | null;
  owningDepartment: DepartmentSummary | null;
  participants: TicketParticipant[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorUserId: string;
  parentCommentId: string | null;
  isInternal: boolean;
  body: string;
  createdAt: string;
}

export interface TicketAction {
  id: string;
  ticketId: string;
  actorUserId: string;
  actionType: TicketActionType;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  targetType: string | null;
  targetRefId: string | null;
  remark: string | null;
  payloadJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  type: TicketType;
  owningDepartmentId: string;
  assigneeUserId?: string;
  projectId?: string;
  sprintId?: string;
  dueDate?: string;
  needsResponse?: boolean;
}

export interface DirectoryUser {
  id: string;
  email: string;
  displayName: string;
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
}

export interface Project {
  id: string;
  name: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  label: string;
  status: string;
}
