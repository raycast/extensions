import { useCachedPromise } from "@raycast/utils";

import { listTickets, type ListTicketsParams } from "../api/tickets";
import type { Ticket } from "../domain/ticket";

const PAGE_SIZE = 50;

export type TicketScope = "mine" | "assigned" | "watching" | "all";

export const SCOPE_LABELS: Record<TicketScope, string> = {
  watching: "Watching",
  assigned: "Assigned to Me",
  mine: "My Tickets",
  all: "All Tickets",
};

export const SCOPE_ORDER: TicketScope[] = ["watching", "assigned", "mine", "all"];

const scopeFilter = (scope: TicketScope, subject: string | undefined): Partial<ListTicketsParams> => {
  if (!subject || scope === "all") return {};

  switch (scope) {
    case "assigned":
      return { assignedUserId: subject };
    case "mine":
      return { creatorUserId: subject };
    case "watching":
    default:
      return { participantUserId: subject };
  }
};

export interface UseTicketsArgs extends Omit<ListTicketsParams, "currentPage" | "pageSize"> {
  scope: TicketScope;
  subject: string | undefined;
  enabled?: boolean;
}

export function useTickets({ scope, subject, enabled = true, ...filters }: UseTicketsArgs) {
  const { data, isLoading, pagination, revalidate, error } = useCachedPromise(
    (currentScope: TicketScope, currentSubject: string | undefined, params: string) =>
      async (options: { page: number }) => {
        const parsed = JSON.parse(params) as Omit<ListTicketsParams, "currentPage" | "pageSize">;

        const page = await listTickets({
          ...parsed,
          ...scopeFilter(currentScope, currentSubject),
          currentPage: options.page + 1,
          pageSize: PAGE_SIZE,
        });

        return {
          data: page.items,
          hasMore: page.pagination.currentPage < page.pagination.totalPages,
        };
      },
    [scope, subject, JSON.stringify(filters)],
    { execute: enabled, keepPreviousData: true },
  );

  return {
    tickets: (data ?? []) as Ticket[],
    isLoading,
    pagination,
    revalidate,
    error,
  };
}
