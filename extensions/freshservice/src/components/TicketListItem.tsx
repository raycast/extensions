import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  Preferences,
} from "../utils/types";
import TicketDetail from "../ticket-detail";

interface TicketListItemProps {
  ticket: Ticket;
}

const getStatusColor = (status: number) => {
  switch (status) {
    case TicketStatus.Open:
      return Color.Blue;
    case TicketStatus.Pending:
      return Color.Orange;
    case TicketStatus.Resolved:
      return Color.Green;
    case TicketStatus.Closed:
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
};

const getPriorityIcon = (priority: number) => {
  switch (priority) {
    case TicketPriority.Urgent:
      return Icon.ExclamationMark;
    case TicketPriority.High:
      return Icon.ArrowUp;
    case TicketPriority.Low:
      return Icon.ArrowDown;
    default:
      return Icon.Circle;
  }
};

export default function TicketListItem({ ticket }: TicketListItemProps) {
  const { domain } = getPreferenceValues<Preferences>();
  const distinctDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <List.Item
      title={ticket.subject}
      subtitle={`#${ticket.id}`}
      icon={{
        source: getPriorityIcon(ticket.priority),
        tintColor: Color.PrimaryText,
      }}
      accessories={[
        {
          tag: {
            value: new Date(ticket.created_at).toLocaleDateString(),
            color: Color.SecondaryText,
          },
          tooltip: "Created At",
        },
        {
          tag: {
            value: TicketStatus[ticket.status] || "Unknown",
            color: getStatusColor(ticket.status),
          },
          tooltip: "Status",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            target={<TicketDetail ticket={ticket} />}
          />
          <Action.OpenInBrowser
            url={`https://${distinctDomain}/helpdesk/tickets/${ticket.id}`}
          />
        </ActionPanel>
      }
    />
  );
}
