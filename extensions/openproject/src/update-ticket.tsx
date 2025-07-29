import { useState } from "react";
import { LaunchProps } from "@raycast/api";
import { WorkPackage } from "./types";
import { SearchTickets, UpdateTicketForm } from "./components";

interface UpdateTicketArguments {
  ticketId?: string;
}

export default function UpdateTicket(props: LaunchProps<{ arguments: UpdateTicketArguments }>) {
  const [selectedTicket, setSelectedTicket] = useState<WorkPackage | null>(null);

  function handleTicketSelect(ticket: WorkPackage) {
    setSelectedTicket(ticket);
  }

  function handleBack() {
    setSelectedTicket(null);
  }

  if (!selectedTicket) {
    return <SearchTickets onSelect={handleTicketSelect} initialTicketId={props.arguments?.ticketId} />;
  }

  return <UpdateTicketForm ticket={selectedTicket} onBack={handleBack} />;
}
