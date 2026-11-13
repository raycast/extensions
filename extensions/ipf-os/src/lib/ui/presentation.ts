import { Color, Icon } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import {
  CLOSED_BADGE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ClosedBadge,
  type TicketPriority,
  type TicketStatus,
} from "../domain/enums";
import type { Ticket } from "../domain/ticket";

export const statusIcon = (status: TicketStatus): { source: Icon; tintColor: Color } => {
  switch (status) {
    case "OPEN":
      return { source: Icon.Circle, tintColor: Color.Blue };
    case "IN_PROGRESS":
      return { source: Icon.CircleProgress50, tintColor: Color.Yellow };
    case "CLOSED":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "BLOCKED":
      return { source: Icon.MinusCircle, tintColor: Color.Red };
  }
};

export const priorityColor = (priority: TicketPriority): Color => {
  switch (priority) {
    case "CRITICAL":
      return Color.Red;
    case "HIGH":
      return Color.Orange;
    case "MEDIUM":
      return Color.Yellow;
    case "NORMAL":
      return Color.SecondaryText;
  }
};

export const closedBadgeColor = (badge: ClosedBadge): Color => {
  switch (badge) {
    case "VERIFIED":
      return Color.Green;
    case "REJECTED":
      return Color.Red;
    case "UNVERIFIED":
      return Color.Orange;
  }
};

export const userAvatar = (name: string) => getAvatarIcon(name);

export const statusLabel = (status: TicketStatus): string => STATUS_LABELS[status];
export const priorityLabel = (priority: TicketPriority): string => PRIORITY_LABELS[priority];
export const closedBadgeLabel = (badge: ClosedBadge): string => CLOSED_BADGE_LABELS[badge];

export const formatDate = (iso: string | null): string | undefined => {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const isOverdue = (ticket: Ticket): boolean => {
  if (ticket.status === "CLOSED" || !ticket.slaDueAt) return false;
  const due = Date.parse(ticket.slaDueAt);
  return !Number.isNaN(due) && due < Date.now();
};
