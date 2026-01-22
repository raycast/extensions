import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import axios from "axios";
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  Conversation,
  StatusOptions,
} from "./utils/types";
import { getAPIDetails, updateTicket } from "./utils/freshservice";
import AddNote from "./AddNote";
import TaskList from "./TaskList";

interface TicketDetailProps {
  ticket: Ticket;
}

export default function TicketDetail({
  ticket: initialTicket,
}: TicketDetailProps) {
  const { baseUrl, headers, domain } = getAPIDetails();

  const { data, isLoading, revalidate } = usePromise(
    async (id: number) => {
      const ticketPromise = axios.get(`${baseUrl}/tickets/${id}`, { headers });
      const conversationsPromise = axios.get(
        `${baseUrl}/tickets/${id}/conversations`,
        { headers },
      );

      const [ticketResponse, conversationsResponse] = await Promise.all([
        ticketPromise,
        conversationsPromise,
      ]);

      const fetchedTicket = ticketResponse.data.ticket as Ticket;
      const conversations = conversationsResponse.data
        .conversations as Conversation[];

      try {
        if (fetchedTicket.requester_id) {
          const requesterResponse = await axios.get(
            `${baseUrl}/requesters/${fetchedTicket.requester_id}`,
            { headers },
          );
          fetchedTicket.requester = requesterResponse.data.requester;
        }
      } catch (err) {
        console.error("Failed to fetch requester:", err);
      }

      return { ticket: fetchedTicket, conversations };
    },
    [initialTicket.id],
  );

  const ticket = data?.ticket || initialTicket;
  const conversations = data?.conversations || [];

  const handleUpdateStatus = async (status: number) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating status...",
    });
    try {
      await updateTicket(ticket.id, { status });
      toast.style = Toast.Style.Success;
      toast.title = "Status updated";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update status";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  };

  const conversationMarkdown =
    conversations.length > 0
      ? `\n\n---\n\n### Conversations\n${conversations
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .map(
            (c) => `
**${c.private ? "🔒 Private Note" : c.incoming ? "📩 Incoming" : "📤 Outgoing"} • ${new Date(c.created_at).toLocaleString()}**
${c.body_text}
`,
          )
          .join("\n---\n")}`
      : "";

  const markdown = `
# ${ticket?.subject || initialTicket.subject}

${ticket?.description_text || ticket?.description || initialTicket.description}

${conversationMarkdown}
  `;

  const requesterName = ticket.requester
    ? `${ticket.requester.first_name || ""} ${ticket.requester.last_name || ""}`.trim()
    : "Unknown";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Reply"
            icon={Icon.Envelope}
            target={
              <AddNote
                ticketId={ticket.id}
                type="reply"
                onNoteAdded={() => revalidate()}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.Push
            title="Add Note"
            icon={Icon.Pencil}
            target={
              <AddNote
                ticketId={ticket.id}
                type="note"
                onNoteAdded={() => revalidate()}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <ActionPanel.Submenu
            title="Update Status"
            icon={Icon.Circle}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          >
            {StatusOptions.map((option) => (
              <Action
                key={option.value}
                title={option.title}
                onAction={() => handleUpdateStatus(option.value)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action.Push
            title="Manage Tasks"
            icon={Icon.CheckList}
            target={<TaskList ticketId={ticket.id} />}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action.OpenInBrowser
            url={`https://${domain}/helpdesk/tickets/${ticket.id}`}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={`#${ticket.id}`} />
          <Detail.Metadata.Label
            title="Status"
            text={TicketStatus[ticket.status] || "Unknown"}
          />
          <Detail.Metadata.Label
            title="Priority"
            text={TicketPriority[ticket.priority] || "Unknown"}
          />
          <Detail.Metadata.Label
            title="Type"
            text={ticket.type || "Incident"}
          />
          {ticket.requester && (
            <Detail.Metadata.Label
              title="Requester"
              text={requesterName}
              icon={ticket.requester.email ? undefined : undefined}
            />
          )}
          {ticket.requester?.email && (
            <Detail.Metadata.Link
              title="Requester Email"
              text={ticket.requester.email}
              target={`mailto:${ticket.requester.email}`}
            />
          )}
          <Detail.Metadata.Label
            title="Due Date"
            text={
              ticket.due_by ? new Date(ticket.due_by).toLocaleDateString() : "-"
            }
          />
          <Detail.Metadata.Label
            title="Created At"
            text={new Date(ticket.created_at).toLocaleDateString()}
          />
        </Detail.Metadata>
      }
    />
  );
}
