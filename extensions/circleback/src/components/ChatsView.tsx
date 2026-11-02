import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { useAssistantChat } from "../hooks/useAssistantChat";
import { useFrameIndex } from "../hooks/useFrameIndex";
import { useTypewriterText } from "../hooks/useTypewriterText";
import { getTurns } from "../utils/assistant/chat";
import { loadRenderer } from "../utils/assistant/image";
import { getTurnMarkdown, getTurnView, removeSources } from "../utils/assistant/markdown";
import { resolveUrl } from "../utils/deepLink";
import { reportErrors } from "../utils/error";

const TURN_SEPARATOR = "\n\n---\n\n";

// Module-level so usePromise doesn't restart on every render.
const getAssistantUrl = reportErrors(() => resolveUrl("/assistant/"));
const loadImageRenderer = reportErrors(loadRenderer);

const ChatsView = ({ initialQuestion }: { initialQuestion?: string }) => {
  const [draft, setDraft] = useState("");
  const { chats, chatId, selectChat, messages, sources, isAnswering, isLoading, hasLoadError, ask } =
    useAssistantChat(initialQuestion);
  const { data: renderer } = usePromise(loadImageRenderer);
  const { data: assistantUrl } = usePromise(getAssistantUrl);
  const turns = getTurns(messages);
  const lastTurn = turns.at(-1);
  const frameIndex = useFrameIndex(isAnswering && lastTurn?.answer.length === 0);
  const typedAnswer = useTypewriterText(isAnswering ? (lastTurn?.answer ?? "") : "", lastTurn?.id);
  const question = draft.trim();
  // Waiting keeps a follow-up from racing the saved history or the current answer.
  const canAsk = question !== "" && chats.length > 0 && !isLoading && !hasLoadError && !isAnswering;

  const markdown = turns
    .map((turn) => {
      const isLoading = isAnswering && turn === lastTurn;
      const answer = isLoading ? typedAnswer : turn.answer;
      return getTurnMarkdown(getTurnView({ turn, answer, isLoading, sources }), renderer, frameIndex);
    })
    .join(TURN_SEPARATOR);

  const actions = (
    <ActionPanel>
      {canAsk ? (
        <Action
          title="Ask"
          icon={Icon.ArrowUp}
          onAction={() => {
            setDraft("");
            ask(question);
          }}
        />
      ) : null}
      {assistantUrl ? (
        <Action.Open
          title="Continue in Circleback"
          icon={Icon.AppWindow}
          target={`${assistantUrl}${chatId}`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      ) : null}
      {lastTurn?.answer ? (
        <Action.CopyToClipboard title="Copy Answer" content={removeSources(lastTurn.answer)} />
      ) : null}
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading || isAnswering}
      isShowingDetail
      searchBarPlaceholder="Ask a follow-up…"
      searchText={draft}
      onSearchTextChange={setDraft}
      filtering={false}
      selectedItemId={chatId}
      onSelectionChange={(id) => selectChat(id ?? undefined)}
      actions={actions}
    >
      <List.EmptyView icon={Icon.Message} title="No chats yet" description="Ask Circleback to start a chat." />
      {chats.map((chat) => (
        <List.Item
          key={chat.id}
          id={chat.id}
          icon={Icon.Message}
          title={chat.name ?? "New chat"}
          accessories={[{ date: chat.updatedAt }]}
          detail={<List.Item.Detail markdown={chat.id === chatId ? markdown : ""} />}
          actions={actions}
        />
      ))}
    </List>
  );
};

export default ChatsView;
