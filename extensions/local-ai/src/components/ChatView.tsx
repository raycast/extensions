import { Action, ActionPanel, Detail, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { existsSync } from "node:fs";
import path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  conversationToMarkdown,
  conversationToText,
  type ChatFailure,
  type StreamingAnswer,
} from "../lib/chats/format";
import { appendMessage, toTurns } from "../lib/chats/operations";
import { buildChatInstructions, buildChatStdin, replayContent } from "../lib/chats/transcript";
import type { Chat, ChatMessage } from "../lib/chats/types";
import { countTokens, respond } from "../lib/fm/client";
import { tooLongMessage } from "../lib/fm/errors";
import { explainFmError } from "../lib/fm/explain";
import { finalizeWindowText, stripSpeakerLabel } from "../lib/output";
import {
  ANSWER_RESERVE_TOKENS,
  CONTEXT_WINDOW_TOKENS,
  SAFETY_MARGIN_TOKENS,
  contextPercent,
  inputTokensFrom,
  questionInputLimit,
  selectHistory,
} from "../lib/tokens";
import { getSettings } from "../services/settings";
import { showFmErrorToast, toFmError } from "../services/errors";
import { AttachImageForm } from "./AttachImageForm";
import { ChatComposer } from "./ChatComposer";
import { ChatSettingsForm } from "./ChatSettingsForm";

export function ChatView(props: { chat: Chat; persist: (chat: Chat) => Promise<boolean>; onNewChat?: () => void }) {
  const { push, pop } = useNavigation();
  const [chat, setChat] = useState(props.chat);
  const [composer, setComposer] = useState("");
  const [streaming, setStreaming] = useState<StreamingAnswer>();
  const [failure, setFailure] = useState<ChatFailure>();
  const [pendingImage, setPendingImage] = useState<string>();
  const [framingTokens, setFramingTokens] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const chatRef = useRef(chat);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const turns = useMemo(() => toTurns(chat.messages), [chat.messages]);
  const percent = useMemo(() => {
    const available = CONTEXT_WINDOW_TOKENS - SAFETY_MARGIN_TOKENS - ANSWER_RESERVE_TOKENS - framingTokens;
    const stored = turns.map((turn) => ({
      userTokens: turn.user.tokens ?? 0,
      assistantTokens: turn.assistant?.tokens ?? 0,
    }));
    return contextPercent(framingTokens + selectHistory(stored, available).usedTokens);
  }, [turns, framingTokens]);

  function adopt(next: Chat) {
    chatRef.current = next;
    setChat(next);
  }

  async function commit(next: Chat): Promise<boolean> {
    adopt(next);
    return props.persist(next);
  }

  async function send(text: string): Promise<void> {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    setFailure(undefined);
    const content = text.trim();
    const imagePath = pendingImage;
    setComposer("");
    let submitted = false;
    let answered = false;
    let userMessageId: string | undefined;
    let partial = "";
    if (imagePath && !existsSync(imagePath)) {
      setPendingImage(undefined);
      setComposer((current) => current || text);
      await showToast({ style: Toast.Style.Failure, title: "Image not found" });
      sendingRef.current = false;
      setIsSending(false);
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    const { timeoutMs, defaultModel, defaultCreativity } = getSettings();
    const instructions = buildChatInstructions(chatRef.current.instructions);
    const rawCount = (value: string, imagePaths?: string[]) =>
      countTokens(value, { instructions, imagePaths, timeoutMs, signal });
    const countMessage = async (value: string, framing: number) => inputTokensFrom(await rawCount(value), framing);

    try {
      const imagePaths = imagePath ? [imagePath] : undefined;
      const [framing, rawMessageCount] = await Promise.all([
        rawCount(""),
        rawCount(content, imagePaths).catch((error: unknown) => {
          if (!imagePaths || signal.aborted) throw error;
          return rawCount(content);
        }),
      ]);
      const messageTokens = inputTokensFrom(rawMessageCount, framing);
      const limit = questionInputLimit(framing);
      if (messageTokens > limit) {
        await showToast({ style: Toast.Style.Failure, title: tooLongMessage(messageTokens, limit) });
        return;
      }
      const storedTokens = imagePath
        ? await countMessage(replayContent({ content, imagePath }), framing)
        : messageTokens;
      setPendingImage(undefined);
      setFramingTokens(framing);

      const counted: ChatMessage[] = [];
      for (const message of chatRef.current.messages) {
        counted.push(
          message.tokens === undefined
            ? { ...message, tokens: await countMessage(replayContent(message), framing) }
            : message,
        );
      }
      const priorTurns = toTurns(counted);
      const available = CONTEXT_WINDOW_TOKENS - SAFETY_MARGIN_TOKENS - ANSWER_RESERVE_TOKENS - framing - messageTokens;
      const { startIndex } = selectHistory(
        priorTurns.map((turn) => ({
          userTokens: turn.user.tokens ?? 0,
          assistantTokens: turn.assistant?.tokens ?? 0,
        })),
        available,
      );
      const stdin = buildChatStdin(priorTurns.slice(startIndex), content);

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        tokens: storedTokens,
        ...(imagePath ? { imagePath } : {}),
        createdAt: now,
      };
      const previous = chatRef.current;
      if (!(await commit(appendMessage({ ...previous, messages: counted }, userMessage, now)))) {
        adopt(previous);
        return;
      }
      submitted = true;
      userMessageId = userMessage.id;
      setStreaming({ userId: userMessage.id, text: "" });

      const output = await respond(stdin, {
        model: defaultModel,
        instructions,
        creativity: defaultCreativity,
        useCase: "general",
        guardrails: "default",
        stream: true,
        imagePaths,
        timeoutMs,
        signal,
        onText: (accumulated) => {
          partial = accumulated;
          if (!signal.aborted) setStreaming({ userId: userMessage.id, text: accumulated });
        },
      });

      const answer = stripSpeakerLabel(finalizeWindowText(output));
      const answeredAt = new Date().toISOString();
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        createdAt: answeredAt,
      };
      await commit(appendMessage(chatRef.current, assistantMessage, answeredAt));
      answered = true;
      setStreaming(undefined);

      const answerTokens = await countMessage(answer, framing).catch(() => undefined);
      if (answerTokens !== undefined) {
        const latest = chatRef.current;
        await commit({
          ...latest,
          messages: latest.messages.map((m) => (m.id === assistantMessage.id ? { ...m, tokens: answerTokens } : m)),
        });
      }
    } catch (error) {
      const fmError = toFmError(error);
      const { title, explanation } = explainFmError(fmError, { surface: "chat" });
      const keptText = answered ? "" : stripSpeakerLabel(finalizeWindowText(partial));
      if (userMessageId && !answered) {
        if (keptText) {
          const interruptedAt = new Date().toISOString();
          await commit(
            appendMessage(
              chatRef.current,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: keptText,
                interruptedReason: title,
                interruptedExplanation: explanation,
                createdAt: interruptedAt,
              },
              interruptedAt,
            ),
          );
        } else {
          setFailure({ userId: userMessageId, title, explanation });
        }
      }
      if (!signal.aborted) await showFmErrorToast(fmError);
    } finally {
      if (!submitted) setComposer((current) => current || text);
      setStreaming(undefined);
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  async function saveInstructions(instructions: string): Promise<boolean> {
    const previous = chatRef.current;
    const saved = await commit({ ...previous, instructions, updatedAt: new Date().toISOString() });
    if (!saved) adopt(previous);
    return saved;
  }

  const isStreaming = streaming !== undefined;
  const isBusy = isStreaming || isSending;
  const lastAnswer = [...turns].reverse().find((turn) => turn.assistant)?.assistant?.content;
  const imageName = pendingImage ? path.basename(pendingImage) : undefined;

  const sharedActions = (
    <>
      {isBusy && <Action title="Stop" icon={Icon.Stop} onAction={() => controllerRef.current?.abort()} />}
      <Action
        title="Attach Image"
        icon={Icon.Image}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => push(<AttachImageForm onAttach={setPendingImage} />)}
      />
      {pendingImage && (
        <Action title="Remove Attached Image" icon={Icon.XMarkCircle} onAction={() => setPendingImage(undefined)} />
      )}
      <Action
        title="Edit Instructions"
        icon={Icon.Pencil}
        onAction={() => push(<ChatSettingsForm instructions={chat.instructions} onSave={saveInstructions} />)}
      />
    </>
  );

  if (turns.length === 0 && !isBusy) {
    return (
      <ChatComposer
        initialText={composer}
        description={
          chat.instructions ? `Answers run on-device. Instructions: ${chat.instructions}` : "Answers run on-device."
        }
        imageName={imageName}
        extraActions={sharedActions}
        onSubmit={(text) => void send(text)}
      />
    );
  }

  return (
    <Detail
      navigationTitle={`${chat.title} · Context ${percent}%`}
      markdown={conversationToMarkdown(turns, streaming, failure)}
      isLoading={isBusy}
      actions={
        <ActionPanel>
          {!isBusy && (
            <Action
              title="Reply"
              icon={Icon.Message}
              onAction={() =>
                push(
                  <ChatComposer
                    initialText={composer}
                    imageName={imageName}
                    onSubmit={(text) => {
                      pop();
                      void send(text);
                    }}
                  />,
                )
              }
            />
          )}
          {props.onNewChat && !isBusy && (
            <Action
              title="New Chat"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={props.onNewChat}
            />
          )}
          {sharedActions}
          {lastAnswer && (
            <Action.CopyToClipboard
              title="Copy Last Answer"
              content={lastAnswer}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {turns.length > 0 && <Action.CopyToClipboard title="Copy Conversation" content={conversationToText(turns)} />}
        </ActionPanel>
      }
    />
  );
}
