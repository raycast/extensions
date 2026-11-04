import { Action, ActionPanel, Color, Icon, LaunchProps, List, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { exportThread, threadURL } from "./lib/amp";
import { askPuck, chatTurns, currentConversation, startConversation, type ChatTurn } from "./lib/puck";
import { openInAmp, RecoveryActions } from "./lib/ui";

export default function AskPuck(props: LaunchProps<{ arguments: Arguments.AskPuck }>) {
  // A conversation started here wins over the one loaded at startup, even if that loads later.
  const [started, setStarted] = useState<string>();
  const initial = usePromise(currentConversation, [], {
    failureToastOptions: { title: "Couldn't open Puck" },
  });
  const conversation = started ?? initial.data;
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const sentInitial = useRef(false);

  const history = usePromise(async (id?: string) => (id ? chatTurns(await exportThread(id)) : []), [conversation], {
    execute: !!conversation,
    failureToastOptions: { title: "Couldn't load the conversation" },
  });
  const error = initial.error ?? history.error;

  async function send(message: string) {
    if (!conversation || !message.trim() || pending) return;
    setInput("");
    setPending(message);
    setSelected("pending");
    try {
      await askPuck(conversation, message);
      await history.revalidate();
      setSelected(undefined);
    } catch (error) {
      await showFailureToast(error, { title: "Puck didn't answer" });
    } finally {
      setPending(undefined);
    }
  }

  useEffect(() => {
    if (conversation && props.arguments.message && !sentInitial.current) {
      sentInitial.current = true;
      send(props.arguments.message);
    }
  }, [conversation]);

  const turns: ChatTurn[] = [...(history.data ?? [])];
  // Show newest exchange first; pair each user message with Puck's reply.
  const exchanges: { ask?: string; answer?: string; key: string }[] = [];
  for (const t of turns) {
    if (t.role === "user") exchanges.push({ ask: t.text, key: String(exchanges.length) });
    else if (exchanges.length && exchanges[exchanges.length - 1].answer === undefined)
      exchanges[exchanges.length - 1].answer = t.text;
    else exchanges.push({ answer: t.text, key: String(exchanges.length) });
  }
  exchanges.reverse();

  const conversationActions = (
    <ActionPanel.Section>
      {conversation && (
        <Action title="Open in Amp" icon={Icon.Globe} onAction={() => openInAmp(threadURL(conversation))} />
      )}
      <Action
        title="New Conversation"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={async () => {
          try {
            setStarted(await startConversation());
          } catch (error) {
            await showFailureToast(error, { title: "Couldn't start a conversation" });
          }
        }}
      />
    </ActionPanel.Section>
  );

  const sendAction = input.trim() ? (
    <Action title="Send to Puck" icon={Icon.ArrowUp} onAction={() => send(input)} />
  ) : null;

  return (
    <List
      isShowingDetail
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={pending ? "Puck is thinking…" : "Message Puck, then press Enter"}
      isLoading={initial.isLoading || history.isLoading || !!pending}
      selectedItemId={selected}
    >
      {error && !pending ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't reach Puck"
          description={error.message}
          actions={
            <RecoveryActions onRetry={() => (initial.error ? initial.revalidate() : history.revalidate())}>
              {conversationActions}
            </RecoveryActions>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="Ask Puck anything"
          description="“Start an agent in pcs/raycast-amp to fix CI” · “What are my agents doing?” · “Archive finished threads”"
          actions={
            <ActionPanel>
              {sendAction}
              {conversationActions}
            </ActionPanel>
          }
        />
      )}
      {pending && (
        <List.Item
          id="pending"
          title={pending}
          icon={{ source: Icon.CircleProgress50, tintColor: Color.Purple }}
          detail={<List.Item.Detail markdown={`**You**\n\n${pending}\n\n---\n\n_Puck is working on it…_`} />}
        />
      )}
      {exchanges.map((x) => (
        <List.Item
          key={x.key}
          id={x.key}
          title={x.ask ?? x.answer?.slice(0, 80) ?? ""}
          icon={x.ask ? Icon.Person : Icon.SpeechBubble}
          detail={
            <List.Item.Detail
              markdown={[x.ask && `**You**\n\n${x.ask}`, x.answer && `**Puck**\n\n${x.answer}`]
                .filter(Boolean)
                .join("\n\n---\n\n")}
            />
          }
          actions={
            <ActionPanel>
              {sendAction}
              {x.answer && <Action.CopyToClipboard title="Copy Answer" content={x.answer} />}
              {x.answer && <Action.Paste title="Paste Answer" content={x.answer} />}
              {conversationActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
