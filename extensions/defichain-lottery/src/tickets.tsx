import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { drawingResult, ticket } from "./types/winner_result";
import { userTickets } from "./service/tickets";
import moment from "moment";
import { formatNumber } from "./service/numbers";

export default function Command() {
  const [list, setList] = useState<drawingResult[]>([]);
  const [currentList, setCurrentList] = useState<drawingResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    userTickets().then((data: drawingResult[]) => {
      setList(data.map((object) => ({ ...object })));
      setCurrentList(data.map((object) => ({ ...object })));
    });
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  function countTickets(source: drawingResult[]): number {
    let ticketCount = 0;

    source.map((drawing: drawingResult) => {
      ticketCount += drawing.tickets.length;
    });

    return ticketCount;
  }

  function showAllTickets() {
    setIsLoading(true);
    setCurrentList(list.map((object) => ({ ...object })));
    showToast({
      style: Toast.Style.Success,
      title: "all tickets visible",
      message: "(" + countTickets(list) + " visible)",
    });
    setTimeout(() => setIsLoading(false), 500);
  }

  function showWinningTickets() {
    setIsLoading(true);
    currentList.map((drawing: drawingResult) => {
      drawing.tickets = drawing.tickets.filter((ticket: ticket) => {
        return ticket.payout_amount !== null && ticket.payout_amount > 0;
      });
    });
    showToast({
      style: Toast.Style.Success,
      title: "winning tickets visible",
      message: "(" + countTickets(currentList) + " visible)",
    });
    setTimeout(() => setIsLoading(false), 500);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Your Defichain Lottery Tickets"
      searchBarPlaceholder="Search your Ticket Number"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter your Tickets"
          placeholder="Select a Filter for your Tickets"
          onChange={(value) => {
            value === "all" ? showAllTickets() : showWinningTickets();
          }}
        >
          <List.Dropdown.Item title="All Tickets" value="all" />
          <List.Dropdown.Item title="Winning Tickets" value="winning" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon="no-view.png"
        title="No Addresses Added"
        description={`Use the Add Address command to add`}
      />
      {currentList.length != 0 &&
        currentList.map((drawing) => (
          <List.Section
            key={drawing.meta.identifier}
            title={
              "#" +
              drawing.meta.round_number +
              " - " +
              drawing.meta.identifier +
              (drawing.meta.winning_number ? " - winning number: " + drawing.meta.winning_number : "")
            }
            subtitle={
              (drawing.user_payout_total > 0
                ? "total winning: " + formatNumber(drawing.user_payout_total, "DFI") + ", "
                : "") +
              drawing.tickets.length +
              " tickets" +
              ", ending " +
              moment(drawing.meta.ending_at).format("DD.MM.YY HH:mm") +
              ", pot size: " +
              formatNumber(drawing.meta.pot_size, "DFI")
            }
          >
            {drawing.tickets.length != 0 &&
              drawing.tickets.map((ticket) => (
                <List.Item
                  icon={Icon.ChevronRight}
                  key={ticket.ticket_number}
                  title={ticket.ticket_number ?? "n/a"}
                  subtitle={
                    (ticket.bucket != 0 && ticket.bucket != null ? ticket.bucket + " correct, " : "") +
                    (ticket.payout_amount != null ? "won " + formatNumber(ticket.payout_amount, "DFI") : "")
                  }
                />
              ))}
            {drawing.tickets.length == 0 && (
              <List.Item
                icon={Icon.XMarkCircleFilled}
                title="No Tickets found"
                actions={
                  <ActionPanel title="Filter the tickets">
                    <Action title="Show all tickets" onAction={() => showAllTickets()} />
                    <Action title="Show winning tickets" onAction={() => showWinningTickets()} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        ))}
    </List>
  );
}
