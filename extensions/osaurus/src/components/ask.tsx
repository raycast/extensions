import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { type Turn, useChat } from "../hooks/use-chat";
import { listChatModels, ServerDownError } from "../lib/osaurus";
import { handleLoadError, syncRaycastModels } from "../lib/server-toast";
import { ServerDownEmptyView } from "./server-down";
import { escapeMarkdown } from "../lib/markdown";
import { QuestionForm } from "./question-form";

// Search-first chat, modeled on the Claude extension's Ask: the search bar is the question,
// each question is a list row, and its answer streams into the row's detail pane.
export function Ask({ initialModel }: { initialModel?: string }) {
  const { push } = useNavigation();
  const chat = useChat();
  const [question, setQuestion] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  // Controlled dropdown backed by our own cache, never storeValue: storeValue restores what the
  // dropdown shows without firing onChange, so the model shown and the model sent can disagree.
  const [savedModel, setSavedModel] = useCachedState<string>("last-model", "");
  // Set in Manage Models. It wins over the last-used model, which only remembers picks made here.
  const [defaultModel] = useCachedState<string>("default-model", "");
  // This session's pick wins over both; it starts as the model passed from Manage Models.
  const [picked, setPicked] = useState(initialModel);
  const changeModel = (id: string) => {
    setPicked(id);
    setSavedModel(id);
  };

  const reload = useRef<() => void>(undefined);
  const {
    data: models,
    isLoading: isLoadingModels,
    error,
    revalidate,
  } = usePromise(listChatModels, [], {
    onError: handleLoadError(reload),
    onData: (list) =>
      syncRaycastModels(
        "ask",
        list.map((m) => m.id),
      ),
  });
  reload.current = revalidate;

  // Ask This Model (from Manage Models) is an explicit choice, so remember it.
  useEffect(() => {
    if (initialModel) setSavedModel(initialModel);
  }, [initialModel]);

  // Any of these may have been deleted since; fall back to the first chat model.
  const resolve = (...ids: (string | undefined)[]) =>
    ids.map((id) => models?.find((m) => m.id === id)?.id).find(Boolean) ?? models?.[0]?.id;
  const model = resolve(picked, defaultModel, savedModel);
  // The dropdown fires onChange with its FIRST item when it mounts, ignoring `value`, so the model
  // it opens on goes first; that mount-time onChange then picks the same model.
  const startModel = resolve(initialModel, defaultModel, savedModel);
  const dropdownModels = models && [...models].sort((a, b) => +(b.id === startModel) - +(a.id === startModel));

  function askQuestion(text: string, modelId = model) {
    if (!text.trim() || !modelId) return;
    setQuestion("");
    chat.ask(text.trim(), modelId);
  }

  const openForm = (title: string, initialQuestion: string) =>
    models &&
    model &&
    push(
      <QuestionForm
        title={title}
        initialQuestion={initialQuestion}
        models={models}
        selectedModel={model}
        onModelChange={changeModel}
        onSubmit={(text, modelId) => askQuestion(text, modelId)}
      />,
    );

  const serverDown = error instanceof ServerDownError;
  const hasTurns = chat.turns.length > 0;

  return (
    <List
      searchText={question}
      onSearchTextChange={setQuestion}
      filtering={false}
      isLoading={isLoadingModels || chat.isStreaming}
      isShowingDetail={hasTurns}
      selectedItemId={chat.selectedId ?? undefined}
      onSelectionChange={(id) => id && id !== chat.selectedId && chat.setSelectedId(id)}
      searchBarPlaceholder={hasTurns ? "Ask a follow-up…" : "Ask Osaurus…"}
      searchBarAccessory={
        models?.length && model ? (
          <List.Dropdown tooltip="Model" value={model} onChange={changeModel}>
            {dropdownModels?.map((m) => (
              <List.Dropdown.Item key={m.id} value={m.id} title={m.id} icon={Icon.ComputerChip} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={
        !hasTurns && models?.length ? (
          <Actions
            question={question}
            isStreaming={false}
            onAsk={() => askQuestion(question)}
            onFullText={() => openForm("Full Text Input", question)}
          />
        ) : undefined
      }
    >
      {serverDown ? (
        <ServerDownEmptyView onReady={revalidate} />
      ) : error ? (
        <List.EmptyView icon={Icon.Warning} title="Couldn't load models" description={error.message} />
      ) : models && models.length === 0 ? (
        <List.EmptyView
          icon={Icon.Download}
          title="No chat models yet"
          description="Pull one in Manage Models. Embedding models can't answer questions."
          actions={
            <ActionPanel>
              <Action
                title="Open Manage Models"
                icon={Icon.ComputerChip}
                onAction={() => launchCommand({ name: "manage-models", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={{ source: "osaurus-logo.svg" }}
          title={question ? "Press ↵ to ask" : "Ask a local model"}
          description={
            question ? "Press ⌘T for a longer prompt." : `Type a question. ${model ?? ""} answers on your Mac.`
          }
        />
      )}
      {hasTurns && (
        <List.Section title="Chat" subtitle={String(chat.turns.length)}>
          {chat.turns.map((turn) => (
            <List.Item
              key={turn.id}
              id={turn.id}
              title={turn.question}
              accessories={accessories(turn)}
              detail={<List.Item.Detail markdown={detailMarkdown(turn, showThinking)} />}
              actions={
                <Actions
                  question={question}
                  turn={turn}
                  isStreaming={chat.isStreaming}
                  showThinking={showThinking}
                  onAsk={() => askQuestion(question)}
                  onStop={chat.stop}
                  onFullText={() => openForm("Full Text Input", question)}
                  onFollowUp={() => openForm("Ask a Follow-up", "")}
                  onToggleThinking={() => setShowThinking((v) => !v)}
                  onNewChat={async () => {
                    const confirmed = await confirmAlert({
                      title: "Start a new chat?",
                      message: "This clears the answers here. Osaurus keeps this chat in its History.",
                      primaryAction: { title: "Start New", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    chat.clear();
                    setQuestion("");
                  }}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// The primary (↵) action follows the state: Stop Answering while a model generates,
// Get Answer when there's a typed question, otherwise Ask a Follow-up on an answered row.
function Actions(props: {
  question: string;
  turn?: Turn;
  isStreaming: boolean;
  showThinking?: boolean;
  onAsk: () => void;
  onStop?: () => void;
  onFullText: () => void;
  onFollowUp?: () => void;
  onToggleThinking?: () => void;
  onNewChat?: () => void;
}) {
  const { question, turn, isStreaming } = props;
  const primary = isStreaming ? (
    <Action title="Stop Answering" icon={Icon.Stop} onAction={props.onStop} />
  ) : question.trim() ? (
    <Action title="Get Answer" icon={Icon.ArrowRight} onAction={props.onAsk} />
  ) : turn?.answer && props.onFollowUp ? (
    <Action title="Ask a Follow-Up" icon={Icon.Bubble} onAction={props.onFollowUp} />
  ) : (
    <Action
      title="Full Text Input"
      icon={Icon.Text}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onAction={props.onFullText}
    />
  );

  return (
    <ActionPanel>
      {primary}
      {isStreaming && question.trim() && <Action title="Get Answer" icon={Icon.ArrowRight} onAction={props.onAsk} />}
      {turn && (
        <ActionPanel.Section title="Copy">
          {turn.answer && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={turn.answer}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {turn.answer && <Action.Paste title="Paste Answer" content={turn.answer} />}
          <Action.CopyToClipboard
            title="Copy Question"
            content={turn.question}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Input">
        {/* Unless it's already the primary action above. */}
        {(question.trim() || turn) && (isStreaming || question.trim() || turn?.answer) && (
          <Action
            title="Full Text Input"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={props.onFullText}
          />
        )}
        {/* Only a finished answer has thinking to hide; a stopped turn's reasoning is all there is. */}
        {turn?.status === "done" && turn.reasoning && turn.answer && props.onToggleThinking && (
          <Action
            title={props.showThinking ? "Hide Thinking" : "Show Thinking"}
            icon={Icon.LightBulb}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={props.onToggleThinking}
          />
        )}
      </ActionPanel.Section>
      {props.onNewChat && (
        <ActionPanel.Section title="Chat">
          <Action
            title="New Chat"
            icon={Icon.RotateAntiClockwise}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={props.onNewChat}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

const seconds = (ms?: number) => (ms === undefined ? "" : `${Math.max(1, Math.round(ms / 1000))}s`);

function accessories(turn: Turn): List.Item.Accessory[] {
  if (turn.status === "streaming") return [{ icon: Icon.CircleProgress, tooltip: "Answering…" }];
  if (turn.status === "stopped") return [{ text: "Stopped", tooltip: turn.model }];
  if (turn.status === "error") return [{ icon: Icon.Warning, tooltip: turn.error }];
  return [{ text: seconds(turn.durationMs), tooltip: turn.model }];
}

const quote = (text: string) =>
  text
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

function detailMarkdown(turn: Turn, showThinking: boolean): string {
  const parts = [`**${escapeMarkdown(turn.question)}**`, "---"];
  // Reasoning streams live until the answer starts, then collapses unless Show Thinking is on.
  if (turn.reasoning && (!turn.answer || showThinking)) {
    parts.push(
      turn.status === "streaming" && !turn.answer ? `_Thinking…_\n\n${quote(turn.reasoning)}` : quote(turn.reasoning),
    );
  }
  if (turn.answer) parts.push(turn.answer);
  if (turn.reasoning && turn.answer && !showThinking && turn.thoughtMs !== undefined) {
    parts.push(`_Thought for ${seconds(turn.thoughtMs)} · ⌘I shows the thinking_`);
  }
  if (turn.status === "stopped") parts.push("_Stopped._");
  if (turn.status === "error") parts.push(escapeMarkdown(turn.error ?? "Something went wrong."));
  return parts.join("\n\n");
}
