import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFmRun } from "../hooks/useFmRun";
import { Chat, chatTitle } from "../lib/chats";
import { sendChatMessage } from "../lib/conversation";
import { errorMarkdown, FmError } from "../lib/errors";
import { CONTEXT_WINDOW } from "../lib/fm";
import { getChatStore, getDefaultInstructions, getWorkDirectory } from "../lib/storage";
import { toTurns, Turn } from "../lib/turns";

function turnMarkdown(question: string, answer: string) {
  return `**You**\n\n${question}\n\n---\n\n${answer}`;
}

/**
 * `initialQuestion` is sent as soon as the chat opens, for a question typed in the chat list. `onChange` runs after
 * each save or delete, also when an answer that was stopped by leaving the chat is saved after the view closed.
 */
export function ChatView({
  chatId,
  initialQuestion,
  onChange,
}: {
  chatId?: string;
  initialQuestion?: string;
  onChange?: () => void;
}) {
  const store = useMemo(getChatStore, []);
  const { pop } = useNavigation();
  const [chat, setChat] = useState<Chat>();
  const [input, setInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string>();
  // A message typed while an answer is still being written. It is sent when that answer is done.
  const [queuedQuestion, setQueuedQuestion] = useState<string>();
  const [usage, setUsage] = useState<{ tokens: number; dropped: number }>();
  // Follows the newest turn, so the answer is visible while it streams in.
  const [selectedId, setSelectedId] = useState<string>();
  const { text, isRunning, error, wasStopped, run, stop } = useFmRun();

  // Refs hold the latest values for code that runs after an answer arrives, so it never works on an old copy.
  const chatRef = useRef<Chat>(undefined);
  const queuedRef = useRef<string>(undefined);
  // True from sending a message until its turn is saved, so a new message waits instead of racing it.
  const busy = useRef(false);
  const stoppedByUser = useRef(false);

  const updateChat = (next: Chat | undefined) => {
    chatRef.current = next;
    setChat(next);
  };
  const updateQueued = (next: string | undefined) => {
    queuedRef.current = next;
    setQueuedQuestion(next);
  };

  const didLoad = useRef(false);
  useEffect(() => {
    // Load once, also when React runs effects twice in development, so the first question is sent once.
    if (didLoad.current) return;
    didLoad.current = true;
    (async () => {
      const saved = chatId ? await store.get(chatId) : undefined;
      updateChat(saved ?? store.create(getDefaultInstructions()));
      if (initialQuestion?.trim()) send(initialQuestion.trim());
    })();
  }, [chatId]);

  async function send(question: string) {
    const started = chatRef.current;
    if (!started || !question || busy.current) return;
    busy.current = true;
    setPendingQuestion(question);
    setSelectedId("pending");
    const result = { tokens: 0, dropped: 0 };
    let partial = "";
    const answer = await run(async (runOptions) => {
      try {
        const turn = await sendChatMessage(started, question, getWorkDirectory(), {
          ...runOptions,
          onText: (value) => {
            partial = value;
            runOptions.onText?.(value);
          },
        });
        result.tokens = turn.promptTokens;
        result.dropped = turn.droppedMessages;
        return turn.answer;
      } catch (caught) {
        // Keep what was written before Stop, so it stays in the chat and the next message can refer to it.
        if (caught instanceof FmError && caught.kind === "cancelled" && partial.trim()) return partial.trim();
        throw caught;
      }
    });
    const userStopped = stoppedByUser.current;
    stoppedByUser.current = false;

    const latest = chatRef.current;
    // When the chat was deleted or replaced by a new one meanwhile, the answer belongs to neither.
    if (latest && latest.id === started.id && answer !== undefined) {
      const now = new Date().toISOString();
      const updated: Chat = {
        ...latest,
        title: latest.messages.length === 0 ? chatTitle(question) : latest.title,
        updatedAt: now,
        messages: [
          ...latest.messages,
          { role: "user", content: question, createdAt: now },
          { role: "assistant", content: answer, createdAt: now },
        ],
      };
      await store.save(updated);
      onChange?.();
      updateChat(updated);
      setPendingQuestion(undefined);
      setSelectedId(toTurns(updated.messages)[0]?.id);
      setUsage(result.tokens > 0 ? result : undefined);
    }
    busy.current = false;

    const queued = queuedRef.current;
    if (!queued) return;
    updateQueued(undefined);
    if (answer === undefined || userStopped) {
      // After Stop or an error, give the waiting message back instead of sending it.
      setInput((current) => current || queued);
    } else {
      send(queued);
    }
  }

  function submitInput() {
    const question = input.trim();
    if (!question) return;
    setInput("");
    if (!busy.current) {
      send(question);
      return;
    }
    // Messages typed while an answer is written are sent together when it is done.
    const queued = queuedRef.current;
    updateQueued(queued ? `${queued}\n\n${question}` : question);
  }

  function stopAnswer() {
    stoppedByUser.current = true;
    stop();
  }

  function cancelQueued() {
    const queued = queuedRef.current;
    if (!queued) return;
    updateQueued(undefined);
    setInput(queued);
  }

  async function deleteChat() {
    const current = chatRef.current;
    if (!current) return;
    const confirmed = await confirmAlert({
      title: "Delete this chat?",
      message: "The conversation is removed from this Mac.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    stop();
    updateChat(undefined);
    await store.delete(current.id);
    onChange?.();
    await showToast({ style: Toast.Style.Success, title: "Chat deleted" });
    pop();
  }

  function startNewChat() {
    stop();
    updateQueued(undefined);
    setPendingQuestion(undefined);
    setUsage(undefined);
    setSelectedId(undefined);
    updateChat(store.create(getDefaultInstructions()));
  }

  async function saveInstructions(instructions: string) {
    const current = chatRef.current;
    if (!current) return;
    const updated = { ...current, instructions };
    if (updated.messages.length > 0) {
      await store.save(updated);
      onChange?.();
    }
    updateChat(updated);
  }

  const turns = chat ? toTurns(chat.messages) : [];
  const hasTurns = turns.length > 0 || pendingQuestion !== undefined;
  let pendingAnswer = text || "_Thinking…_";
  if (error) pendingAnswer = errorMarkdown(error);
  else if (wasStopped) pendingAnswer = `${text}\n\n_Stopped._`;

  const usageText = usage
    ? `${usage.tokens.toLocaleString()} of ${CONTEXT_WINDOW.toLocaleString()} tokens sent${
        usage.dropped > 0 ? `, ${usage.dropped} older messages left out` : ""
      }`
    : undefined;

  const stopAction = (
    <Action title="Stop" icon={Icon.Stop} shortcut={{ modifiers: ["ctrl"], key: "c" }} onAction={stopAnswer} />
  );

  const actions = (selected?: Turn) => (
    <ActionPanel>
      {input.trim() && (
        <Action
          title={isRunning ? "Send When Done" : "Send Message"}
          icon={isRunning ? Icon.Clock : Icon.Message}
          onAction={submitInput}
        />
      )}
      {isRunning && stopAction}
      {!isRunning && pendingQuestion && (error || wasStopped) && (
        <Action
          title="Try Again"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => send(pendingQuestion)}
        />
      )}
      {queuedQuestion && <Action title="Edit Waiting Message" icon={Icon.Pencil} onAction={cancelQueued} />}
      {selected?.answer && (
        <>
          <Action.CopyToClipboard title="Copy Answer" content={selected.answer} />
          <Action.CopyToClipboard
            title="Copy Question"
            content={selected.question}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </>
      )}
      <ActionPanel.Section>
        {hasTurns && (
          <Action
            title="New Chat"
            icon={Icon.PlusCircle}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={startNewChat}
          />
        )}
        {chat && (
          <Action.Push
            title="Edit Instructions"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<InstructionsForm instructions={chat.instructions} onSave={saveInstructions} />}
          />
        )}
        {chat && chat.messages.length > 0 && (
          <Action
            title="Delete Chat"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={deleteChat}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={!chat || isRunning}
      isShowingDetail={hasTurns}
      filtering={false}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={
        isRunning ? "Type your next message, it is sent when the answer is done" : "Type a message and press Enter"
      }
      navigationTitle={chat?.title ?? "Chat"}
      actions={actions()}
    >
      {!hasTurns ? (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="Ask anything"
          description="Type a message and press Enter. The model runs on this Mac, so nothing leaves it."
          actions={actions()}
        />
      ) : (
        <>
          {queuedQuestion !== undefined && (
            <List.Item
              id="queued"
              title={queuedQuestion}
              icon={Icon.Clock}
              accessories={[{ text: "Waiting" }]}
              detail={
                <List.Item.Detail markdown={turnMarkdown(queuedQuestion, "_Sent when the current answer is done._")} />
              }
              actions={actions()}
            />
          )}
          {pendingQuestion !== undefined && (
            <List.Item
              id="pending"
              title={pendingQuestion}
              icon={isRunning ? Icon.Ellipsis : error ? Icon.ExclamationMark : Icon.SpeechBubble}
              detail={<List.Item.Detail markdown={turnMarkdown(pendingQuestion, pendingAnswer)} />}
              actions={actions()}
            />
          )}
          {turns.map((turn, index) => (
            <List.Item
              key={turn.id}
              id={turn.id}
              title={turn.question}
              icon={Icon.SpeechBubble}
              detail={
                <List.Item.Detail
                  markdown={turnMarkdown(turn.question, turn.answer)}
                  metadata={
                    index === 0 && pendingQuestion === undefined && usageText ? (
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Context" text={usageText} />
                      </List.Item.Detail.Metadata>
                    ) : undefined
                  }
                />
              }
              actions={actions(turn)}
            />
          ))}
        </>
      )}
    </List>
  );
}

function InstructionsForm({
  instructions,
  onSave,
}: {
  instructions: string;
  onSave: (value: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Edit Instructions"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Instructions"
            onSubmit={async (values: { instructions: string }) => {
              await onSave(values.instructions.trim());
              await showToast({ style: Toast.Style.Success, title: "Instructions saved" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="instructions"
        title="Instructions"
        defaultValue={instructions}
        info="The model follows these in every answer of this chat. Short instructions leave more room for the conversation."
      />
    </Form>
  );
}
