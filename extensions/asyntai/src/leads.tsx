import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE, Lead, ago, dashboardUrl, headers, parseResponse, query } from "./api";
import Transcript from "./transcript";
import ErrorView from "./error-view";

export default function Leads() {
  const url = `${BASE}/api/v1/leads/${query({ limit: 100 })}`;
  const { isLoading, data, error, revalidate } = useFetch(url, {
    headers: headers(),
    parseResponse: (response) => parseResponse<{ leads: Lead[] }>(response),
    keepPreviousData: true,
  });

  const leads = data?.leads || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search leads">
      {error ? <ErrorView message={error.message} retry={revalidate} /> : null}
      {error ? null : (
        <List.EmptyView
          icon={Icon.Person}
          title="No leads yet"
          description="A lead appears when a visitor leaves an email address or a phone number in the chat."
        />
      )}
      {leads.map((lead) => {
        const title = lead.email || lead.phone || lead.session_id;
        const subtitle = lead.email && lead.phone ? lead.phone : lead.page_url || "";
        return (
          <List.Item
            key={lead.session_id}
            icon={Icon.Person}
            title={title}
            subtitle={subtitle}
            keywords={[lead.email || "", lead.phone || "", lead.page_url || ""].filter(Boolean)}
            accessories={[{ text: ago(lead.started_at), tooltip: lead.started_at || "" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Conversation"
                  icon={Icon.Eye}
                  target={<Transcript sessionId={lead.session_id} title={title} />}
                />
                {lead.email ? <Action.CopyToClipboard title="Copy Email" content={lead.email} /> : null}
                {lead.phone ? <Action.CopyToClipboard title="Copy Phone" content={lead.phone} /> : null}
                <Action.OpenInBrowser title="Open in Asyntai" url={dashboardUrl(lead.session_id)} />
                {lead.page_url ? (
                  <Action.OpenInBrowser title="Open the Page" url={lead.page_url} icon={Icon.Globe} />
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
