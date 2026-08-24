import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { api, APP_URL, authHeaders, normalizeList, reactMessage, sendMessage, unreactMessage } from "../lib/postproxy";
import { participantProfileUrl, supportsReactions } from "../lib/dm";
import type { Chat, Message } from "../lib/types";
import { ErrorView } from "./ErrorView";
import { ReplyForm } from "./ReplyForm";

const REACTIONS = ["love", "like", "smile", "wow", "sad", "angry"];

function messageMarkdown(message: Message, chatTitle: string): string {
  const who = message.direction === "inbound" ? chatTitle : "You";
  const lines = [`**${who}**`, "", message.body || "_(no text)_"];
  if (message.reactions && message.reactions.length > 0) {
    const rendered = message.reactions.map((reaction) => reaction.emoji ?? reaction.reaction ?? "•").join(" ");
    lines.push("", `Reactions: ${rendered}`);
  }
  return lines.join("\n");
}

export function MessagesView({ chat }: { chat: Chat }) {
  const chatTitle = chat.participant_name ?? chat.participant_username ?? "Chat";
  const { data, isLoading, error, revalidate } = useFetch(api(`/chats/${chat.id}/messages?per_page=50`), {
    headers: authHeaders(),
    mapResult: (result: unknown) => ({ data: normalizeList<Message>(result) }),
    keepPreviousData: true,
    initialData: [] as Message[],
  });

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title: label });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: `${label} failed` });
    }
  }

  const canReact = supportsReactions(chat.platform);
  const participantUrl = participantProfileUrl(chat.platform, chat.participant_username, chat.participant_external_id);

  const replyAction = (
    <Action.Push
      title="Reply"
      icon={Icon.Reply}
      target={
        <ReplyForm
          title={`Message ${chatTitle}`}
          placeholder="Write a message…"
          submitTitle="Send"
          onSend={(text) => sendMessage(chat.id, text)}
          onDone={revalidate}
        />
      }
    />
  );

  const chatActions = (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open Chat on Postproxy" icon={Icon.Globe} url={`${APP_URL}/chats/${chat.id}`} />
      {participantUrl ? (
        <Action.OpenInBrowser title="Open Participant Profile on Platform" icon={Icon.Person} url={participantUrl} />
      ) : null}
    </ActionPanel.Section>
  );

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={chatTitle} searchBarPlaceholder="Search messages…">
      {error && data.length === 0 ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : data.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No messages"
          description="Start the conversation."
          actions={
            <ActionPanel>
              {replyAction}
              {chatActions}
            </ActionPanel>
          }
        />
      ) : (
        data.map((message) => {
          const inbound = message.direction === "inbound";
          return (
            <List.Item
              key={message.id}
              icon={{
                source: inbound ? Icon.ArrowDownCircle : Icon.ArrowUpCircle,
                tintColor: inbound ? Color.Blue : Color.Green,
              }}
              title={(message.body ?? "(no text)").replace(/\s+/g, " ").slice(0, 60)}
              accessories={[
                ...(message.reactions && message.reactions.length > 0
                  ? [{ text: message.reactions.map((reaction) => reaction.emoji ?? "•").join("") }]
                  : []),
                { date: new Date(message.external_posted_at ?? message.created_at) },
              ]}
              detail={<List.Item.Detail markdown={messageMarkdown(message, chatTitle)} />}
              actions={
                <ActionPanel>
                  {replyAction}
                  {canReact ? (
                    <ActionPanel.Section>
                      <ActionPanel.Submenu title="React" icon={Icon.Emoji}>
                        {REACTIONS.map((reaction) => (
                          <Action
                            key={reaction}
                            title={reaction}
                            onAction={() => run("Reacted", () => reactMessage(message.id, reaction))}
                          />
                        ))}
                      </ActionPanel.Submenu>
                      <Action
                        title="Remove Reaction"
                        icon={Icon.XMarkCircle}
                        onAction={() => run("Reaction removed", () => unreactMessage(message.id))}
                      />
                    </ActionPanel.Section>
                  ) : null}
                  {chatActions}
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
