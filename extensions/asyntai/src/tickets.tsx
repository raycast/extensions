import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE, PAGE_SIZE, Ticket, ago, dashboardUrl, headers, nextPage, parseResponse, query } from "./api";
import Transcript from "./transcript";
import ErrorView from "./error-view";

const STATUS_COLOR: Record<string, Color> = {
  open: Color.Orange,
  pending: Color.Yellow,
  resolved: Color.Green,
  closed: Color.SecondaryText,
};

export default function Tickets() {
  const { isLoading, data, error, revalidate, pagination } = useFetch(
    (options) => `${BASE}/api/v1/tickets/${query({ limit: PAGE_SIZE, before: options.cursor })}`,
    {
      headers: headers(),
      parseResponse: (response) => parseResponse<{ tickets: Ticket[] }>(response),
      mapResult: (result) => ({
        data: result.tickets || [],
        ...nextPage(result.tickets || [], (t) => t.created_at),
      }),
      keepPreviousData: true,
      initialData: [],
    },
  );

  const tickets = data || [];

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search tickets">
      {error ? <ErrorView message={error.message} retry={revalidate} /> : null}
      {error ? null : (
        <List.EmptyView
          icon={Icon.Tag}
          title="No tickets yet"
          description="A ticket appears when a chat is escalated to your team."
        />
      )}
      {tickets.map((t, index) => {
        const status = (t.status || "open").toLowerCase();
        const title = t.subject || t.ticket_number || "Ticket";
        return (
          <List.Item
            key={t.ticket_number || t.session_id || String(index)}
            icon={Icon.Tag}
            title={title}
            subtitle={[t.ticket_number, t.visitor_email].filter(Boolean).join(" · ")}
            keywords={[t.ticket_number || "", t.visitor_email || "", status]}
            accessories={[
              { tag: { value: status, color: STATUS_COLOR[status] || Color.PrimaryText } },
              { text: ago(t.created_at), tooltip: t.created_at || "" },
            ]}
            actions={
              <ActionPanel>
                {t.session_id ? (
                  <Action.Push
                    title="Read Conversation"
                    icon={Icon.Eye}
                    target={<Transcript sessionId={t.session_id} title={t.ticket_number || title} />}
                  />
                ) : null}
                {t.session_id ? (
                  <Action.OpenInBrowser title="Open in Asyntai" url={dashboardUrl(t.session_id)} />
                ) : null}
                {t.visitor_email ? <Action.CopyToClipboard title="Copy Email" content={t.visitor_email} /> : null}
                {t.ticket_number ? (
                  <Action.CopyToClipboard title="Copy Ticket Number" content={t.ticket_number} />
                ) : null}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
