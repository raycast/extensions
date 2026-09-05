import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";

import { getTicket, listActions, listComments } from "../lib/api/tickets";
import { ticketWebUrl } from "../lib/config";
import { ACTION_TYPE_LABELS, PARTICIPANT_ROLE_LABELS, SYSTEM_ACTOR_USER_ID, TYPE_LABELS } from "../lib/domain/enums";
import { permissionsForTicket } from "../lib/domain/permissions";
import type { Ticket, TicketAction, TicketComment } from "../lib/domain/ticket";
import { useDirectory } from "../lib/hooks/use-directory";
import { useSession } from "../lib/hooks/use-session";
import type { DirectoryLookup } from "../lib/api/directory";
import {
  closedBadgeColor,
  closedBadgeLabel,
  formatDate,
  formatDateTime,
  isOverdue,
  priorityColor,
  priorityLabel,
  statusIcon,
  statusLabel,
  userAvatar,
} from "../lib/ui/presentation";
import { TicketActions } from "./ticket-actions";

interface TicketDetailProps {
  ticketId: string;
  onMutate?: () => void;
}

export function TicketDetail({ ticketId, onMutate }: TicketDetailProps) {
  const { session } = useSession();
  const { lookup } = useDirectory();

  const {
    data: ticket,
    isLoading,
    revalidate,
    error,
  } = useCachedPromise(getTicket, [ticketId], { keepPreviousData: true });

  const { data: comments, revalidate: revalidateComments } = useCachedPromise(listComments, [ticketId], {
    keepPreviousData: true,
  });

  const { data: actions, revalidate: revalidateActions } = useCachedPromise(listActions, [ticketId], {
    keepPreviousData: true,
  });

  const refreshAll = () => {
    revalidate();
    revalidateComments();
    revalidateActions();
    onMutate?.();
  };

  if (error) {
    return <Detail markdown={`# Could not load ticket\n\n${error.message}`} />;
  }

  if (!ticket) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const permissions = permissionsForTicket(ticket, session?.subject, session?.role);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={ticket.ticketNumber}
      markdown={renderMarkdown(ticket, comments ?? [], actions ?? [], lookup)}
      metadata={renderMetadata(ticket, actions ?? [], lookup)}
      actions={
        <ActionPanel>
          <TicketActions ticket={ticket} permissions={permissions} lookup={lookup} onMutate={refreshAll} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in IPF OS" url={ticketWebUrl(ticket.id)} />
            <Action.CopyToClipboard title="Copy Ticket Number" content={ticket.ticketNumber} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={refreshAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderMarkdown(
  ticket: Ticket,
  comments: TicketComment[],
  actions: TicketAction[],
  lookup: DirectoryLookup,
): string {
  const sections = [`# ${ticket.title}`, ticket.description || "_No description provided._"];

  if (comments.length > 0) {
    sections.push(`## Comments (${comments.length})`);
    for (const comment of comments) {
      const author = lookup.userName(comment.authorUserId);
      const marker = comment.isInternal ? " · Internal note" : "";
      sections.push(
        `**${author}** · ${formatDateTime(comment.createdAt)}${marker}\n\n${stripMentionMarkup(comment.body)}`,
      );
    }
  }

  if (actions.length > 0) {
    sections.push("## Timeline");
    const entries = actions.map((action) => {
      const actor = action.actorUserId === SYSTEM_ACTOR_USER_ID ? "System" : lookup.userName(action.actorUserId);
      const remark = action.remark ? ` — ${action.remark}` : "";
      return `- \`${formatDateTime(action.createdAt)}\` **${ACTION_TYPE_LABELS[action.actionType]}** by ${actor}${remark}`;
    });
    sections.push(entries.join("\n"));
  }

  return sections.join("\n\n");
}

function stripMentionMarkup(body: string): string {
  return body
    .replace(/<[^>]+>/g, (tag) => (tag.startsWith("</") ? "" : ""))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function slaProgressIcon(ticket: Ticket, actions: TicketAction[]) {
  if (!ticket.slaDueAt || ticket.status === "CLOSED") return undefined;

  const created = actions.find((action) => action.actionType === "CREATED")?.createdAt;
  if (!created) return undefined;

  const start = Date.parse(created);
  const end = Date.parse(ticket.slaDueAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;

  const elapsed = (Date.now() - start) / (end - start);
  const progress = Math.min(Math.max(elapsed, 0), 1);

  return getProgressIcon(progress, isOverdue(ticket) ? Color.Red : priorityColor(ticket.priority));
}

function renderMetadata(ticket: Ticket, actions: TicketAction[], lookup: DirectoryLookup) {
  const assignees = ticket.participants.filter((p) => p.role === "ASSIGNEE");
  const others = ticket.participants.filter((p) => p.role !== "ASSIGNEE");
  const due = formatDate(ticket.slaDueAt);
  const clock = isOverdue(ticket) ? { source: Icon.Clock, tintColor: Color.Red } : Icon.Clock;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Ticket" text={ticket.ticketNumber} />
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item text={statusLabel(ticket.status)} color={statusIcon(ticket.status).tintColor} />
        {ticket.closedBadge ? (
          <Detail.Metadata.TagList.Item
            text={closedBadgeLabel(ticket.closedBadge)}
            color={closedBadgeColor(ticket.closedBadge)}
          />
        ) : null}
      </Detail.Metadata.TagList>

      <Detail.Metadata.TagList title="Priority">
        <Detail.Metadata.TagList.Item text={priorityLabel(ticket.priority)} color={priorityColor(ticket.priority)} />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Label title="Ticket Type" text={TYPE_LABELS[ticket.type]} />
      <Detail.Metadata.Label
        title="Department"
        text={ticket.owningDepartment?.name ?? lookup.departmentName(ticket.owningDepartmentId)}
      />
      <Detail.Metadata.Label
        title="Created By"
        text={lookup.userName(ticket.creatorUserId)}
        icon={userAvatar(lookup.userName(ticket.creatorUserId))}
      />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title={assignees.length > 1 ? "Assignees" : "Assignee"}
        text={assignees.length > 0 ? assignees.map((p) => lookup.userName(p.userId)).join(", ") : "Unassigned"}
        icon={assignees.length === 1 ? userAvatar(lookup.userName(assignees[0].userId)) : undefined}
      />
      {others.length > 0 ? (
        <Detail.Metadata.TagList title="Participants">
          {others.map((participant) => {
            const name = lookup.userName(participant.userId);
            return (
              <Detail.Metadata.TagList.Item
                key={participant.id}
                text={`${name} · ${PARTICIPANT_ROLE_LABELS[participant.role]}`}
                color={Color.SecondaryText}
                icon={userAvatar(name)}
              />
            );
          })}
        </Detail.Metadata.TagList>
      ) : null}

      <Detail.Metadata.Separator />

      {due ? (
        <Detail.Metadata.Label
          title="SLA Due"
          text={{ value: due, color: isOverdue(ticket) ? Color.Red : undefined }}
          icon={slaProgressIcon(ticket, actions) ?? clock}
        />
      ) : null}
      {ticket.dueDate ? <Detail.Metadata.Label title="Due Date" text={formatDate(ticket.dueDate)} /> : null}
      {ticket.escalated ? (
        <Detail.Metadata.Label
          title="Escalated"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          text="SLA breached"
        />
      ) : null}
      {ticket.needsResponse ? <Detail.Metadata.Label title="Needs Response" icon={Icon.Reply} text="Yes" /> : null}
      {ticket.blockerId ? (
        <Detail.Metadata.Label
          title="Blocked By"
          icon={{ source: Icon.MinusCircle, tintColor: Color.Red }}
          text="Another ticket"
        />
      ) : null}
    </Detail.Metadata>
  );
}
