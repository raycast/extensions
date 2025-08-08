import { useState, useEffect } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { WorkPackage } from "../types";
import { TicketListItem, EmptyView } from "./";
import OpenProjectAPI from "../api";

interface SearchTicketsProps {
  onSelect: (ticket: WorkPackage) => void;
  initialTicketId?: string;
}

export function SearchTickets({ onSelect, initialTicketId }: SearchTicketsProps) {
  const [searchText, setSearchText] = useState("");
  const [tickets, setTickets] = useState<WorkPackage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [api, setApi] = useState<OpenProjectAPI | null>(null);

  useEffect(() => {
    async function initializeAPI() {
      try {
        const apiInstance = new OpenProjectAPI();
        const connectionOk = await apiInstance.testConnection();

        if (!connectionOk) {
          throw new Error("Failed to connect to OpenProject. Please check your API URL and key.");
        }

        setApi(apiInstance);

        if (initialTicketId) {
          try {
            const ticket = await apiInstance.getWorkPackage(parseInt(initialTicketId));
            onSelect(ticket);
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Ticket not found",
              message: `Ticket #${initialTicketId} could not be loaded`,
            });
          }
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: "Please check your OpenProject settings in Raycast preferences",
        });
      }
    }

    initializeAPI();
  }, [initialTicketId]);

  useEffect(() => {
    if (!api || searchText.trim().length === 0) {
      setTickets([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await api.searchWorkPackages(searchText);
        setTickets(results);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setTickets([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText, api]);

  if (!api) {
    return (
      <List>
        <EmptyView
          title="Connection Error"
          description="Failed to connect to OpenProject. Please check your settings."
          icon="⚠️"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isSearching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for ticket to update..."
      throttle={true}
    >
      {tickets.length === 0 && searchText.trim().length > 0 && !isSearching ? (
        <EmptyView title="No tickets found" description={`No tickets found matching "${searchText}"`} icon="🔍" />
      ) : tickets.length === 0 && searchText.trim().length === 0 ? (
        <EmptyView
          title="Search OpenProject Tickets"
          description="Start typing to search for tickets to update"
          icon="🎫"
        />
      ) : (
        tickets.map((ticket) => <TicketListItem key={ticket.id} ticket={ticket} onSelect={onSelect} />)
      )}
    </List>
  );
}
