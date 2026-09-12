import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BASE, Message, dashboardUrl, headers, parseResponse, query } from "./api";

// The whole conversation of one session, visitor and assistant, in order.
export default function Transcript(props: { sessionId: string; title: string }) {
  const url = `${BASE}/api/v1/conversations/${query({ session_id: props.sessionId, limit: 100 })}`;
  const { isLoading, data } = useFetch(url, {
    headers: headers(),
    parseResponse: (response) => parseResponse<{ messages: Message[] }>(response),
    keepPreviousData: true,
  });

  const messages = data?.messages || [];
  const lines = messages.map((m) => {
    const who = m.role === "user" ? "Visitor" : "Assistant";
    return `**${who}**\n\n${m.content || ""}`;
  });
  const markdown =
    isLoading && !messages.length ? "" : `# ${props.title}\n\n${lines.join("\n\n---\n\n") || "_No messages._"}`;
  const text = messages.map((m) => `${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content || ""}`).join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={props.title}
      actions={
        <ActionPanel>
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
