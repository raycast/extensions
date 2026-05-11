import { useCachedPromise } from "@raycast/utils";
import { paymenter, TICKET_COLORS } from "./config";
import { ActionPanel, Icon, List } from "@raycast/api";
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
              <OpenInPaymenter route="tickets" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
