import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { createSessionTitle, getSession, saveSession } from "./history-store";
import { ModelPicker } from "./model-picker";
import { streamChatCompletion } from "./openai-client";
import { getProviders, resolveActiveModel } from "./provider-store";
import type { ChatMessage, ChatSession, ProviderProfile } from "./types";

function isoNow(): string {
  return new Date().toISOString();
}

function quoteMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function renderTranscript(
  session: ChatSession,
  showReasoning: boolean,
): string {
  const parts = session.messages.map((message) => {
    if (message.role === "user")
      return `**You**\n\n${quoteMarkdown(message.content)}`;

    const reasoning =
      showReasoning && message.reasoning
        ? `_Thinking_\n\n${quoteMarkdown(message.reasoning)}\n\n`
        : "";
    let status = "";
    if (message.status === "streaming")
      status = message.content ? "\n\n_Generating…_" : "_Thinking…_";
    if (message.status === "interrupted") status = "\n\n_Response stopped._";
    if (message.status === "error")
      status = "\n\n_Response failed. Use Regenerate Last Answer to retry._";
    return `**AI**\n\n${reasoning}${message.content || status}${message.content ? status : ""}`;
  });
  return parts.join("\n\n\n\n") || "_No messages yet._";
}

function FollowUpForm(props: { onSubmit: (prompt: string) => void }) {
  const { pop } = useNavigation();
  const [prompt, setPrompt] = useState("");
  const promptRef = useRef<Form.TextArea>(null);

  useEffect(() => {
    setPrompt("");
    promptRef.current?.reset();
  }, []);

  return (
    <Form
      enableDrafts={false}
      navigationTitle="Continue Chat"
      actions={
        <ActionPanel>
          <Action
            title="Send Message"
            icon={Icon.ArrowRight}
            onAction={() => {
              const value = prompt.trim();
              if (!value) return;
              pop();
              props.onSubmit(value);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        ref={promptRef}
        id="prompt"
        placeholder="Ask anything..."
        value={prompt}
        onChange={setPrompt}
        autoFocus
        storeValue={false}
      />
    </Form>
  );
}

export function ConversationView(props: {
  initialPrompt?: string;
  sessionId?: string;
  onChanged?: () => void | Promise<void>;
}) {
  const [session, setSession] = useState<ChatSession>();
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const sessionRef = useRef<ChatSession | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const startedRef = useRef(false);

  const commitSession = (next: ChatSession) => {
    sessionRef.current = next;
    setSession(next);
  };

  const persist = async (next: ChatSession) => {
    commitSession(next);
    await saveSession(next);
    await props.onChanged?.();
  };

  const requestAssistant = async (baseSession: ChatSession) => {
    const availableProviders = await getProviders();
    setProviders(availableProviders);
    const provider = availableProviders.find(
      (item) => item.id === baseSession.providerId,
    );
    if (!provider) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Provider is no longer available",
        message: "Choose another model to continue this conversation.",
      });
      return;
    }

    const assistant: ChatMessage = {
      id: randomUUID(),
      role: "assistant",
      content: "",
      reasoning: "",
      status: "streaming",
      createdAt: isoNow(),
    };
    const pending: ChatSession = {
      ...baseSession,
      messages: [...baseSession.messages, assistant],
      updatedAt: isoNow(),
    };
    await persist(pending);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let streamedContent = "";
    let streamedReasoning = "";

    try {
      const result = await streamChatCompletion({
        provider,
        modelId: pending.modelId,
        systemPrompt: pending.systemPrompt,
        messages: pending.messages.filter(
          (message) => message.id !== assistant.id,
        ),
        signal: controller.signal,
        onDelta: (delta) => {
          streamedContent += delta.content ?? "";
          streamedReasoning += delta.reasoning ?? "";
          const current = sessionRef.current;
          if (!current) return;
          commitSession({
            ...current,
            messages: current.messages.map((message) =>
              message.id === assistant.id
                ? {
                    ...message,
                    content: streamedContent,
                    reasoning: streamedReasoning,
                  }
                : message,
            ),
          });
        },
      });
      const current = sessionRef.current ?? pending;
      await persist({
        ...current,
        updatedAt: isoNow(),
        messages: current.messages.map((message) =>
          message.id === assistant.id
            ? {
                ...message,
                content: result.content,
                reasoning: result.reasoning,
                status: "complete",
              }
            : message,
        ),
      });
    } catch (error) {
      const current = sessionRef.current ?? pending;
      const stopped = controller.signal.aborted;
      const failed: ChatSession = {
        ...current,
        updatedAt: isoNow(),
        messages: current.messages.map((message) =>
          message.id === assistant.id
            ? {
                ...message,
                content:
                  message.content ||
                  (stopped
                    ? ""
                    : error instanceof Error
                      ? error.message
                      : String(error)),
                status: stopped ? "interrupted" : "error",
              }
            : message,
        ),
      };
      await persist(failed);
      if (!stopped) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AI request failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      abortRef.current = undefined;
      setIsStreaming(false);
    }
  };

  const sendUserMessage = async (prompt: string) => {
    const current = sessionRef.current;
    if (!current || isStreaming) return;
    const userMessage: ChatMessage = {
      id: randomUUID(),
      role: "user",
      content: prompt,
      status: "complete",
      createdAt: isoNow(),
    };
    const next: ChatSession = {
      ...current,
      messages: [...current.messages, userMessage],
      updatedAt: isoNow(),
    };
    await persist(next);
    await requestAssistant(next);
  };

  const regenerate = async () => {
    const current = sessionRef.current;
    if (!current || isStreaming) return;
    const last = current.messages.at(-1);
    if (last?.role !== "assistant") return;
    const next = {
      ...current,
      messages: current.messages.slice(0, -1),
      updatedAt: isoNow(),
    };
    await persist(next);
    await requestAssistant(next);
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      const availableProviders = await getProviders();
      setProviders(availableProviders);

      if (props.sessionId) {
        const stored = await getSession(props.sessionId);
        if (stored) commitSession(stored);
        setIsInitializing(false);
        return;
      }

      const resolved = await resolveActiveModel();
      if (!resolved || !props.initialPrompt?.trim()) {
        setIsInitializing(false);
        return;
      }
      const now = isoNow();
      const userMessage: ChatMessage = {
        id: randomUUID(),
        role: "user",
        content: props.initialPrompt.trim(),
        status: "complete",
        createdAt: now,
      };
      const created: ChatSession = {
        id: randomUUID(),
        title: createSessionTitle(props.initialPrompt),
        providerId: resolved.provider.id,
        providerName: resolved.provider.name,
        modelId: resolved.modelId,
        systemPrompt: resolved.provider.systemPrompt,
        messages: [userMessage],
        createdAt: now,
        updatedAt: now,
      };
      await persist(created);
      setIsInitializing(false);
      await requestAssistant(created);
    })();
    return () => abortRef.current?.abort();
  }, []);

  if (isInitializing)
    return <Detail isLoading markdown="_Loading conversation…_" />;
  if (!session) {
    return (
      <Detail markdown="# Conversation unavailable\n\nThe saved conversation could not be loaded." />
    );
  }

  const lastAssistant = [...session.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const hasReasoning = session.messages.some((message) =>
    Boolean(message.reasoning),
  );
  return (
    <Detail
      isLoading={isStreaming}
      navigationTitle={`${session.providerName} · ${session.modelId}`}
      markdown={renderTranscript(session, showReasoning)}
      actions={
        <ActionPanel>
          {isStreaming ? (
            <Action
              title="Stop Generation"
              icon={Icon.Stop}
              onAction={() => abortRef.current?.abort()}
            />
          ) : (
            <Action.Push
              title="Ask Follow-Up"
              icon={Icon.Message}
              shortcut={{ modifiers: ["ctrl"], key: "enter" }}
              target={
                <FollowUpForm
                  onSubmit={(prompt) => void sendUserMessage(prompt)}
                />
              }
            />
          )}
          {!isStreaming ? (
            <Action.Push
              title="Switch Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["ctrl"], key: "m" }}
              target={
                <ModelPicker
                  providers={providers}
                  onSelect={async (provider, modelId) => {
                    const current = sessionRef.current;
                    if (!current) return;
                    await persist({
                      ...current,
                      providerId: provider.id,
                      providerName: provider.name,
                      modelId,
                      systemPrompt: provider.systemPrompt,
                      updatedAt: isoNow(),
                    });
                  }}
                />
              }
            />
          ) : null}
          {!isStreaming && lastAssistant ? (
            <Action
              title="Regenerate Last Answer"
              icon={Icon.ArrowClockwise}
              onAction={() => void regenerate()}
            />
          ) : null}
          {hasReasoning ? (
            <Action
              title={showReasoning ? "Hide Thinking" : "Show Thinking"}
              icon={Icon.Eye}
              onAction={() => setShowReasoning((value) => !value)}
            />
          ) : null}
          {lastAssistant?.content ? (
            <Action.CopyToClipboard
              title="Copy Last Answer"
              content={lastAssistant.content}
            />
          ) : null}
          <Action
            title="Copy Full Conversation"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(renderTranscript(session, showReasoning));
              await showToast({
                style: Toast.Style.Success,
                title: "Conversation copied",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
