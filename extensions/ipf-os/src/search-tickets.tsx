import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useState } from "react";

import { ticketWebUrl } from "./lib/config";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  TICKET_TYPES,
  TYPE_LABELS,
  type TicketStatus,
  type TicketType,
} from "./lib/domain/enums";
import type { Ticket } from "./lib/domain/ticket";
import { useDirectory } from "./lib/hooks/use-directory";
import { useSession } from "./lib/hooks/use-session";
import { SCOPE_LABELS, SCOPE_ORDER, useTickets, type TicketScope } from "./lib/hooks/use-tickets";
import {
  closedBadgeColor,
  closedBadgeLabel,
  formatDate,
  isOverdue,
  priorityColor,
  priorityLabel,
  statusIcon,
  statusLabel,
} from "./lib/ui/presentation";
import { AuthErrorView } from "./views/auth-error";
import { TicketDetail } from "./views/ticket-detail";

export default function SearchTicketsCommand() {
  const [scope, setScope] = useState<TicketScope>("watching");
  const [status, setStatus] = useState<TicketStatus | undefined>();
  const [type, setType] = useState<TicketType | undefined>();
  const [searchText, setSearchText] = useState("");

  const { session, error: sessionError } = useSession();
  const { lookup } = useDirectory();

  const { tickets, isLoading, pagination, revalidate, error } = useTickets({
    scope,
    subject: session?.subject,
    status,
    type,
    search: searchText.trim() || undefined,
    enabled: Boolean(session) || scope === "all",
  });

  if (sessionError) {
    return <AuthErrorView error={sessionError} />;
  }

  const activeFilters = [status ? STATUS_LABELS[status] : undefined, type ? TYPE_LABELS[type] : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by ticket number, title, or description"
      navigationTitle={activeFilters ? `${SCOPE_LABELS[scope]} · ${activeFilters}` : SCOPE_LABELS[scope]}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Show tickets" value={scope} onChange={(value) => setScope(value as TicketScope)}>
          {SCOPE_ORDER.map((value) => (
            <List.Dropdown.Item key={value} title={SCOPE_LABELS[value]} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load tickets"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        tickets.map((ticket) => (
          <TicketListItem
            key={ticket.id}
            ticket={ticket}
            departmentName={lookup.departmentName(ticket.owningDepartmentId)}
            status={status}
            type={type}
            onStatusChange={setStatus}
            onTypeChange={setType}
            onRefresh={revalidate}
          />
        ))
      )}

      {!isLoading && !error && tickets.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Nothing here"
          description={
            searchText
              ? "No ticket matches that search. Try a ticket number or a word from the title."
              : `No tickets in ${SCOPE_LABELS[scope]}. Switch the filter in the top right to widen the search.`
          }
        />
      ) : null}
    </List>
  );
}

interface TicketListItemProps {
  ticket: Ticket;
  departmentName: string;
  status: TicketStatus | undefined;
  type: TicketType | undefined;
  onStatusChange: (status: TicketStatus | undefined) => void;
  onTypeChange: (type: TicketType | undefined) => void;
  onRefresh: () => void;
}

function TicketListItem({
  ticket,
  departmentName,
  status,
  type,
  onStatusChange,
  onTypeChange,
  onRefresh,
}: TicketListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (ticket.escalated) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      tooltip: "Escalated — SLA breached",
    });
  }

  if (ticket.needsResponse) {
    accessories.push({
      icon: { source: Icon.Reply, tintColor: Color.Blue },
      tooltip: "Creator asked to be notified when this closes",
    });
  }

  if (ticket.closedBadge) {
    accessories.push({
      tag: {
        value: closedBadgeLabel(ticket.closedBadge),
        color: closedBadgeColor(ticket.closedBadge),
      },
    });
  }

  accessories.push({
    tag: { value: priorityLabel(ticket.priority), color: priorityColor(ticket.priority) },
  });

  const due = formatDate(ticket.slaDueAt);
  if (due) {
    accessories.push({
      text: { value: due, color: isOverdue(ticket) ? Color.Red : Color.SecondaryText },
      tooltip: isOverdue(ticket) ? `SLA breached ${due}` : `SLA due ${due}`,
    });
  }

  return (
    <List.Item
      icon={statusIcon(ticket.status)}
      title={ticket.title}
      subtitle={ticket.ticketNumber}
      keywords={[ticket.ticketNumber, departmentName]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Ticket"
              icon={Icon.Sidebar}
              target={<TicketDetail ticketId={ticket.id} onMutate={onRefresh} />}
            />
            <Action.OpenInBrowser title="Open in IPF OS" url={ticketWebUrl(ticket.id)} />
            <Action.CopyToClipboard
              title="Copy Ticket Number"
              content={ticket.ticketNumber}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Narrow Results">
            <ActionPanel.Submenu title="Filter by Status" icon={Icon.Filter}>
              <Action
                title="Any Status"
                icon={status ? Icon.Circle : Icon.CheckCircle}
                onAction={() => onStatusChange(undefined)}
              />
              {TICKET_STATUSES.map((value) => (
                <Action
                  key={value}
                  title={statusLabel(value)}
                  icon={status === value ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => onStatusChange(value)}
                />
              ))}
            </ActionPanel.Submenu>

            <ActionPanel.Submenu title="Filter by Ticket Type" icon={Icon.Tag}>
              <Action
                title="Any Type"
                icon={type ? Icon.Circle : Icon.CheckCircle}
                onAction={() => onTypeChange(undefined)}
              />
              {TICKET_TYPES.map((value) => (
                <Action
                  key={value}
                  title={TYPE_LABELS[value]}
                  icon={type === value ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => onTypeChange(value)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
