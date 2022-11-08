import { List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { drawingResult } from "./types/winner_result";
import { userTickets } from "./service/tickets";
import moment from "moment";
import { formatNumber } from "./service/numbers";

export default function Command() {
  const [list, setList] = useState<drawingResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    userTickets().then((data: drawingResult[]) => {
      setList(data);
    });
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Your Defichain Lottery tickets"
      searchBarPlaceholder="Search your ticket number"
    >
      {list.length != 0 &&
        list.map((drawing) => (
          <List.Section
            key={drawing.meta.identifier}
            title={drawing.meta.identifier}
            subtitle={
              (drawing.user_payout_total > 0 ? "total winning: " + formatNumber(drawing.user_payout_total, 'DFI') + ', ' : '') +
              "ending at " + moment(drawing.meta.ending_at).format("DD.MM.YY HH:mm") +
              " with pot size of " +
              formatNumber(drawing.meta.pot_size, "DFI")
            }
          >
            {drawing.tickets.length != 0 &&
              drawing.tickets.map((ticket) => (
                <List.Item
                  icon={Icon.ChevronRight}
                  key={ticket.ticket_number}
                  title={ticket.ticket_number ?? 'n/a'}
                  subtitle={
                    (ticket.bucket != 0 && ticket.bucket != null ? ticket.bucket + " correct, " : "") +
                    (ticket.payout_amount != null ? "won " + formatNumber(ticket.payout_amount, "DFI") : "")
                  }
                />
              ))}
          </List.Section>
        ))}
    </List>
  );
}
