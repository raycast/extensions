import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getAPIDetails } from "./utils/freshservice";
import TicketListItem from "./components/TicketListItem";
import { Ticket } from "./utils/types";
import { URLSearchParams } from "url";

export default function Command() {
  const { baseUrl, headers } = getAPIDetails();

  const { isLoading, data, pagination } = useFetch<
    { tickets: Ticket[] },
    Ticket[]
  >(
    (options) => {
      const params = new URLSearchParams();
      params.append("page", String(options.page + 1));
      params.append("per_page", "30");
      params.append("filter", "new_and_my_open");

      return `${baseUrl}/tickets?${params.toString()}`;
    },
    {
      headers,
      mapResult(result) {
        return {
          data: result.tickets || [],
          hasMore: (result.tickets?.length || 0) === 30,
        };
      },
      keepPreviousData: true,
      initialData: [] as Ticket[],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter tickets..."
    >
      {(data as Ticket[]).map((ticket) => (
        <TicketListItem key={ticket.id} ticket={ticket} />
      ))}
    </List>
  );
}
