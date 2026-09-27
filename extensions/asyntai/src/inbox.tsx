import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE, Session, ago, dashboardUrl, headers, isOwnQuestion, parseResponse, query } from "./api";
import Transcript from "./transcript";
import ErrorView from "./error-view";

export default function Inbox() {
  const url = `${BASE}/api/v1/sessions/${query({ limit: 50 })}`;
  const { isLoading, data, error, revalidate } = useFetch(url, {
    headers: headers(),
    parseResponse: (response) => parseResponse<{ sessions: Session[] }>(response),
    keepPreviousData: true,
  });

  const sessions = (data?.sessions || []).filter((s) => !isOwnQuestion(s.session_id));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search chats">
      {error ? <ErrorView message={error.message} retry={revalidate} /> : null}
      {error ? null : (
        <List.EmptyView
          icon={Icon.Message}
          title="No chats yet"
          description="A chat appears here as soon as a visitor writes to your chatbot."
        />
      )}
      {sessions.map((s) => {
        const title = s.first_message || s.website_domain || s.session_id;
        const bits = [s.website_domain, s.country, s.category].filter(Boolean) as string[];
        return (
          <List.Item
            key={s.session_id}
            icon={Icon.Message}
            title={title}
            subtitle={bits.join(" · ")}
            keywords={bits}
            accessories={[
              { text: `${s.message_count || 0}`, icon: Icon.SpeechBubble, tooltip: "Messages" },
              { text: ago(s.last_message_at), tooltip: s.last_message_at || "" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Read Conversation"
                  icon={Icon.Eye}
                  target={<Transcript sessionId={s.session_id} title={s.website_domain || s.session_id} />}
                />
                <Action.OpenInBrowser title="Open in Asyntai" url={dashboardUrl(s.session_id)} />
                {s.page_url ? <Action.OpenInBrowser title="Open the Page" url={s.page_url} icon={Icon.Globe} /> : null}
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
