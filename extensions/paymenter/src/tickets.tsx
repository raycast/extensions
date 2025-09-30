import { useCachedPromise } from "@raycast/utils";
import { paymenter, TICKET_COLORS } from "./config";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import OpenInPaymenter from "./open-in-paymenter";

export default function Tickets() {
  const { isLoading, data: tickets } = useCachedPromise(
    async () => {
      const result = await paymenter.tickets.list();
      return result.data;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {tickets.map((ticket) => (
        <List.Item
          key={ticket.id}
          icon={Icon.Headphones}
          title={ticket.attributes.subject}
          accessories={[
            {
              tag: { value: ticket.attributes.status, color: TICKET_COLORS[ticket.attributes.status] },
            },
            { tag: ticket.attributes.priority },
            { tag: ticket.attributes.department },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.SpeechBubble}
                title="Ticket Messages"
                target={<TicketMessages ticketId={ticket.id} />}
              />
              <OpenInPaymenter route="tickets" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TicketMessages({ ticketId }: { ticketId: string }) {
  const { isLoading, data: messages } = useCachedPromise(
    async () => {
      const result = await paymenter.ticketMessages.list(ticketId);
      return result.data;
    },
    [],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading} isShowingDetail>
      {messages.map((message) => (
        <List.Item
          key={message.id}
          title={message.id}
          detail={<List.Item.Detail markdown={message.attributes.message} />}
        />
      ))}
    </List>
  );
}
