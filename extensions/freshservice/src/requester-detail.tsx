import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Requester, Ticket, Asset, TicketStatus } from "./utils/types";
import {
  getAPIDetails,
  getRequesterTickets,
  getRequesterAssets,
} from "./utils/freshservice";
import TicketDetail from "./ticket-detail";

interface RequesterDetailProps {
  requester: Requester;
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

export default function RequesterDetail({ requester }: RequesterDetailProps) {
  const { domain } = getAPIDetails();

  const { data: ticketsData, isLoading: ticketsLoading } = usePromise(
    async (id: number) => {
      const result = await getRequesterTickets(id);
      return result.tickets as Ticket[];
    },
    [requester.id],
  );

  const { data: assetsData, isLoading: assetsLoading } = usePromise(
    async (id: number) => {
      const result = await getRequesterAssets(id);
      return result.assets as Asset[];
    },
    [requester.id],
  );

  const tickets = ticketsData || [];
  const assets = assetsData || [];
  const isLoading = ticketsLoading || assetsLoading;

  const fullName =
    `${requester.first_name || ""} ${requester.last_name || ""}`.trim() ||
    "No Name";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={fullName}
      searchBarPlaceholder="Filter tickets and assets..."
    >
      <List.Section title="Requester Information">
        <List.Item
          title={fullName}
          subtitle={requester.primary_email}
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          accessories={[
            ...(requester.job_title ? [{ text: requester.job_title }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Profile in Browser"
                url={`https://${domain}/itil/requesters/${requester.id}`}
              />
              <Action.CopyToClipboard
                title="Copy Email"
                content={requester.primary_email}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
        {requester.mobile_phone_number && (
          <List.Item
            title="Mobile"
            subtitle={requester.mobile_phone_number}
            icon={Icon.Phone}
          />
        )}
        {requester.work_phone_number && (
          <List.Item
            title="Work Phone"
            subtitle={requester.work_phone_number}
            icon={Icon.Phone}
          />
        )}
      </List.Section>

      <List.Section title={`Tickets (${tickets.length})`}>
        {tickets.length === 0 && !ticketsLoading ? (
          <List.Item title="No tickets found" icon={Icon.XMarkCircle} />
        ) : (
          tickets.map((ticket) => (
            <List.Item
              key={ticket.id}
              title={ticket.subject}
              subtitle={`#${ticket.id}`}
              icon={Icon.Document}
              accessories={[
                {
                  tag: {
                    value: TicketStatus[ticket.status] || "Unknown",
                    color: getStatusColor(ticket.status),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Ticket"
                    icon={Icon.Eye}
                    target={<TicketDetail ticket={ticket} />}
                  />
                  <Action.OpenInBrowser
                    title="Open Ticket in Browser"
                    url={`https://${domain}/helpdesk/tickets/${ticket.id}`}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>

      <List.Section title={`Assets (${assets.length})`}>
        {assets.length === 0 && !assetsLoading ? (
          <List.Item title="No assets found" icon={Icon.XMarkCircle} />
        ) : (
          assets.map((asset) => (
            <List.Item
              key={asset.id}
              title={asset.name}
              subtitle={asset.asset_tag || `#${asset.display_id}`}
              icon={{ source: Icon.ComputerChip, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Asset in Browser"
                    url={`https://${domain}/cmdb/items/${asset.display_id}`}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
