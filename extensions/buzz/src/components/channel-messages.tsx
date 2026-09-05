import { useRef } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { BuzzClient } from "../lib/buzz-client";
import { buildChannelLink, buildMessageLink } from "../lib/buzz-link";
import { errorMessage } from "../lib/errors";
import { Channel } from "../lib/types";
import { ErrorView } from "./error-view";

export function ChannelMessages({ client, channel }: { client: BuzzClient; channel: Channel }) {
  const { isLoading, data, error, revalidate } = usePromise(async (id: string) => client.getMessages(id), [channel.id]);
  // Which messages have a reaction in flight. A Nostr reaction is an ordinary,
  // non-replaceable kind:7 event, so a second fire before the first resolves
  // publishes a second one. Keyed by message id, and a ref rather than state,
  // since two clicks can land in the same tick: liking a different message
  // meanwhile is still allowed, liking the same one twice is not.
  const reacting = useRef(new Set<string>());

  if (error) {
    return <ErrorView error={error} />;
  }

  const messages = data?.messages ?? [];
  // The fetched window can be entirely thread replies whose root fell outside
  // it: `messages` comes back empty even though the channel is not empty.
  // `fetchedCount` (raw relay events, before filtering) is what tells that
  // case apart from a genuinely empty channel, where it is 0 too.
  const allRepliesHidden = messages.length === 0 && (data?.fetchedCount ?? 0) > 0;

  async function like(msgId: string) {
    if (reacting.current.has(msgId)) return;
    reacting.current.add(msgId);
    try {
      await client.react(msgId, channel.id, "+");
      await showToast({ style: Toast.Style.Success, title: "Reaction sent" });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reaction failed",
        message: errorMessage(e),
      });
      return;
    } finally {
      // Released on failure too, so a reaction the relay rejected can be retried.
      reacting.current.delete(msgId);
    }
    await revalidate();
  }

  return (
    <List isLoading={isLoading} navigationTitle={channel.name || channel.id}>
      {allRepliesHidden ? (
        <List.EmptyView
          title="Only thread replies here"
          description="The most recent messages in this channel are all replies to older threads. Open it in Buzz to see them."
          actions={
            <ActionPanel>
              <Action.Open title="Open in Buzz" target={buildChannelLink(channel.id)} icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      ) : (
        // Raycast's native filtering is on here (no onSearchTextChange), so this
        // view also stands in for "the search matched nothing", a state this
        // component cannot see. Adding onSearchTextChange to tell the two apart
        // would silently turn that filtering off, so the copy is neutral instead
        // of claiming the channel is empty when it may not be.
        <List.EmptyView
          title="No messages to show"
          description="This channel has no messages yet, or none match the current search."
        />
      )}
      {messages.map((message) => {
        // The h tag is authoritative, but inside a channel we already know
        // which one we are viewing, so a message that lost its tag is still
        // linkable rather than losing its actions.
        const link = buildMessageLink(message.channelId || channel.id, message.id);
        return (
          <List.Item
            key={message.id}
            title={message.content || "(no content)"}
            subtitle={message.author.slice(0, 8)}
            accessories={[
              ...(message.replyCount > 0
                ? [{ text: message.replyCount === 1 ? "1 reply" : `${message.replyCount} replies` }]
                : []),
              { date: new Date(message.createdAt * 1000) },
            ]}
            actions={
              <ActionPanel>
                <Action.Open title="Open in Buzz" target={link} icon={Icon.AppWindow} />
                <Action title="React (Like)" onAction={() => like(message.id)} />
                <Action.CopyToClipboard title="Copy Link" content={link} />
                <Action.CopyToClipboard title="Copy Message" content={message.content} />
                <Action.CopyToClipboard title="Copy Message ID" content={message.id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
