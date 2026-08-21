import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { listTickets } from "./lib/api/tickets";
import { ticketWebUrl } from "./lib/config";
import type { Ticket } from "./lib/domain/ticket";
import { useSession } from "./lib/hooks/use-session";
import { isOverdue, statusIcon } from "./lib/ui/presentation";

const PAGE_SIZE = 100;
const MAX_SHOWN = 8;

async function fetchAssigned(subject: string) {
  const [openPage, inProgressPage] = await Promise.all([
    listTickets({ assignedUserId: subject, status: "OPEN", pageSize: PAGE_SIZE }),
    listTickets({ assignedUserId: subject, status: "IN_PROGRESS", pageSize: PAGE_SIZE }),
  ]);

  return {
    total: openPage.pagination.total + inProgressPage.pagination.total,
    tickets: [...inProgressPage.items, ...openPage.items],
  };
}

export default function AssignedTicketsCommand() {
  const { session } = useSession({ interactive: false });
  const subject = session?.subject;

  const { data, isLoading, error } = useCachedPromise(fetchAssigned, [subject ?? ""], {
    execute: Boolean(subject),
    keepPreviousData: true,
  });

  const tickets = data?.tickets ?? [];
  const overdue = tickets.filter(isOverdue);
  const current = tickets.filter((ticket) => !isOverdue(ticket));
  const total = data?.total ?? 0;

  return (
    <MenuBarExtra
      icon={Icon.Tray}
      isLoading={isLoading}
      title={total > 0 ? String(total) : undefined}
      tooltip="iPF OS tickets assigned to you"
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item icon={Icon.Warning} title="Could not load tickets" subtitle={error.message} />
        </MenuBarExtra.Section>
      ) : null}

      {overdue.length > 0 ? (
        <MenuBarExtra.Section title="Overdue">
          {overdue.slice(0, MAX_SHOWN).map((ticket) => (
            <TicketItem key={ticket.id} ticket={ticket} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section title="Assigned to Me">
        {current.slice(0, MAX_SHOWN).map((ticket) => (
          <TicketItem key={ticket.id} ticket={ticket} />
        ))}
        {!error && total === 0 ? <MenuBarExtra.Item title="Nothing assigned" /> : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Search Tickets"
          onAction={() => launchCommand({ name: "search-tickets", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Plus}
          title="Create Ticket"
          onAction={() => launchCommand({ name: "create-ticket", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function TicketItem({ ticket }: { ticket: Ticket }) {
  return (
    <MenuBarExtra.Item
      icon={statusIcon(ticket.status)}
      title={ticket.title}
      subtitle={ticket.ticketNumber}
      onAction={() => open(ticketWebUrl(ticket.id))}
    />
  );
}
