import { List } from "@raycast/api";
import { useState } from "react";
import { useFetch } from "@raycast/utils";
import { getAPIDetails } from "./utils/freshservice";
import TicketListItem from "./components/TicketListItem";
import { Ticket } from "./utils/types";
import { URLSearchParams } from "url";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { baseUrl, headers } = getAPIDetails();

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      const params = new URLSearchParams();
      params.append("page", String(options.page + 1));
      params.append("per_page", "30");

      if (searchText) {
        // Determine if we should search by ID or Subject
        // Note: Freshservice query syntax usually requires specific fields
        const safeText = searchText.replace(/'/g, ""); // Simple sanitization

        // If the user types a number, it's ambiguous, but let's assume Subject for strict safety
        // unless we implement explicit "id:123" logic or use a specific search endpoint.
        // For now, search subject.
        params.append("query", `"subject:'${safeText}'"`);
      }

      return `${baseUrl}/tickets?${params.toString()}`;
    },
    {
      headers,
      mapResult(result: { tickets: Ticket[] }) {
        return {
          data: result.tickets || [],
          hasMore: (result.tickets?.length || 0) === 30,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by subject..."
      throttle
    >
      {data.map((ticket) => (
        <TicketListItem key={ticket.id} ticket={ticket} />
      ))}
    </List>
  );
}
