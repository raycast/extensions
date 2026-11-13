import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { TupleErrorEmptyView } from "./lib/empty-state";
import { listReactions, reactionTitle, sendReaction } from "./lib/reactions";

export default function SendReaction() {
  const { data, error, isLoading, revalidate } = usePromise(listReactions, [], { onError: () => {} });
  const [sending, setSending] = useState(false);
  const reactions = error ? [] : (data ?? []);

  async function send(reaction: string) {
    if (sending) return;
    setSending(true);
    try {
      await sendReaction(reaction);
      await showHUD(`Sent ${reactionTitle(reaction)}`);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Send Reaction" });
      void revalidate();
    } finally {
      setSending(false);
    }
  }

  return (
    <List isLoading={isLoading || sending} searchBarPlaceholder="Search Tuple reactions">
      {reactions.map((reaction) => (
        <List.Item
          key={reaction}
          title={reactionTitle(reaction)}
          subtitle={reaction}
          icon={Icon.Message}
          actions={
            <ActionPanel>
              <Action title="Send Reaction" icon={Icon.Message} onAction={() => send(reaction)} />
              <Action title="Refresh Reactions" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
      {error ? (
        <TupleErrorEmptyView error={error} onRetry={revalidate} />
      ) : data?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="No Reactions Available"
          description="The installed Tuple CLI did not provide any reactions."
          actions={
            <ActionPanel>
              <Action title="Refresh Reactions" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
