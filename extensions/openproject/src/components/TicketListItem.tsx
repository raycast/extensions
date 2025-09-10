import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { WorkPackage } from "../types";

interface TicketListItemProps {
  ticket: WorkPackage;
  onSelect: (ticket: WorkPackage) => void;
}

export function TicketListItem({ ticket, onSelect }: TicketListItemProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case "new":
      case "open":
        return Color.Blue;
      case "in progress":
      case "in development":
        return Color.Yellow;
      case "resolved":
      case "closed":
        return Color.Green;
      case "rejected":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List.Item
      icon={Icon.Document}
      title={`#${ticket.id} ${ticket.subject}`}
      subtitle={ticket.project?.name || "Unknown Project"}
      accessories={[
        {
          tag: {
            value: ticket.status?.name || "Unknown",
            color: getStatusColor(ticket.status?.name || ""),
          },
        },
        {
          text: formatDate(ticket.updatedAt),
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Select Ticket" onAction={() => onSelect(ticket)} icon={Icon.Pencil} />
        </ActionPanel>
      }
    />
  );
}
