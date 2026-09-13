import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE, Message, dashboardUrl, headers, parseResponse, query, safeMarkdown } from "./api";

// The whole conversation of one session, visitor and assistant, in order.
export default function Transcript(props: { sessionId: string; title: string }) {
  const url = `${BASE}/api/v1/conversations/${query({ session_id: props.sessionId, limit: 100 })}`;
  const { isLoading, data, error, revalidate } = useFetch(url, {
    headers: headers(),
    parseResponse: (response) => parseResponse<{ messages: Message[] }>(response),
    keepPreviousData: true,
  });

  const messages = data?.messages || [];
  const lines = messages.map((m) => {
    const who = m.role === "user" ? "Visitor" : "Assistant";
    return `**${who}**\n\n${safeMarkdown(m.content || "")}`;
  });
  let markdown = `# ${props.title}\n\n${lines.join("\n\n---\n\n") || "_No messages._"}`;
  if (error) {
    markdown = `# ${props.title}\n\n**Asyntai did not answer.**\n\n${safeMarkdown(error.message)}`;
  } else if (isLoading && !messages.length) {
    markdown = "";
  }
  const text = messages.map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content || ""}`).join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          {error ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} /> : null}
          {error ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
          <Action.OpenInBrowser title="Open in Asyntai" url={dashboardUrl(props.sessionId)} />
          <Action.CopyToClipboard title="Copy Conversation" content={text} icon={Icon.Clipboard} />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={props.sessionId}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
