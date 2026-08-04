import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import type { AuthSession } from "./lib/auth";
import {
  explainAIError,
  isModelNotFound,
  shouldRetryWithoutUsage,
} from "./lib/ai-error";
import { EveryApi } from "./lib/api";
import { HttpClient } from "./lib/http";
import {
  availableModels,
  markModelUnavailable,
} from "./lib/model-availability";
import { resolveDefaultModel } from "./lib/models";
import { modelProviderIcon } from "./lib/provider-icons";
import { streamChatCompletion } from "./lib/streaming-chat";
import { AuthGate } from "./lib/use-auth";
import { useDefaultModel } from "./lib/use-cached-model";
import { apiBase, gatewayOrigin } from "./lib/url";

// "Ask EveryAPI" — the workhorse command. Prompt + model picker → a Chat
// view that holds the whole conversation: streamed answers you can stop
// mid-flight, follow-up turns with full context, per-reply model/token/
// latency stats, and mid-conversation model switching. The conversation
// persists in LocalStorage across invocations (capped at MAX_TURNS
// messages), so "Continue Last Conversation" picks up where you left off.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  // assistant-only stats
  model?: string;
  tokens?: number; // total tokens for the turn (prompt + completion)
  estimated?: boolean; // true when the gateway didn't return usage
  ms?: number;
  stopped?: boolean; // user aborted the stream mid-flight
}

interface SavedConversation {
  messages: ChatMessage[];
  model: string;
  updatedAt: number;
}

const CONVO_KEY = "everyapi.conversation.v1";
// Cap mirrors the cross-surface store in the design handoff (40 messages):
// enough context for a long session, small enough that the request body
// and LocalStorage entry stay reasonable.
const MAX_TURNS = 40;

async function loadConversation(): Promise<SavedConversation | null> {
  const raw = await LocalStorage.getItem<string>(CONVO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedConversation;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function saveConversation(messages: ChatMessage[], model: string) {
  const trimmed = messages.slice(-MAX_TURNS);
  await LocalStorage.setItem(
    CONVO_KEY,
    JSON.stringify({
      messages: trimmed,
      model,
      updatedAt: Date.now(),
    } satisfies SavedConversation),
  );
}

// Local fallback when the gateway doesn't return streaming usage. CJK
// scripts run ~1 token per character; everything else averages ~4 chars
// per token. Coarse, but only used for the "~N tok" label.
function estimateTokens(s: string): number {
  const cjk = (s.match(/[\u3000-\u9fff\uf900-\ufaff]/g) || []).length;
  return Math.max(1, cjk + Math.ceil((s.length - cjk) / 4));
}

function fmtTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function Ask() {
  const preferences = getPreferenceValues<Preferences>();
  const origin = gatewayOrigin(preferences.baseUrl);
  return (
    <AuthGate apiBase={apiBase(origin)}>
      {({ session }) => <AskAuthenticated session={session} origin={origin} />}
    </AuthGate>
  );
}

function AskAuthenticated({
  session,
  origin,
}: {
  session: AuthSession;
  origin: string;
}) {
  const { push } = useNavigation();
  const { model: defaultModel, loaded } = useDefaultModel();
  const [submitting, setSubmitting] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);
  const [saved, setSaved] = useState<SavedConversation | null>(null);

  // Pull the live model list from /v1/models so users always see whatever
  // their EveryAPI account actually exposes — frontier models change month
  // to month and a hardcoded list goes stale fast. Failure here is non-
  // fatal: we fall back to the user's default model as the only option.
  useEffect(() => {
    void (async () => {
      try {
        const res = await new EveryApi(
          new HttpClient({ origin, auth: session }),
        ).models();
        const ids = (await availableModels(res.data))
          .map((m) => m.id)
          .sort((a, b) => a.localeCompare(b));
        setModels(ids);
      } catch (e) {
        setModels([]);
        void showFailureToast(e instanceof Error ? e.message : String(e), {
          title: "Couldn't load model list",
        });
      }
    })();
    void loadConversation().then(setSaved);
  }, [origin, session]);

  const dropdownItems = models ?? [];
  const initialSelected = resolveDefaultModel(
    dropdownItems.map((id) => ({ id })),
    defaultModel,
  );

  const resolveModel = (formModel: string): string | null => {
    const chosen = formModel || initialSelected;
    if (!chosen) {
      void showFailureToast(
        "No models are available for this account. Refresh the command or check EveryAPI service status.",
        { title: "No model selected" },
      );
      return null;
    }
    return chosen;
  };

  const open = (history: ChatMessage[], prompt: string, model: string) => {
    setSubmitting(true);
    push(
      <Chat
        initialMessages={history}
        initialPrompt={prompt}
        initialModel={model}
        models={models ?? []}
        session={session}
        origin={origin}
      />,
    );
    // We push the Chat view immediately; resetting the submitting flag
    // lets the form be usable again if the user comes back.
    setTimeout(() => setSubmitting(false), 100);
  };

  const savedTurns = saved
    ? saved.messages.filter((m) => m.role === "user").length
    : 0;

  return (
    <Form
      isLoading={!loaded || models === null || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ArrowRight}
            title="Ask (New Conversation)"
            onSubmit={(values: { prompt: string; model: string }) => {
              if (!values.prompt.trim()) {
                void showFailureToast("Type a prompt first", {
                  title: "Empty prompt",
                });
                return;
              }
              const chosen = resolveModel(values.model);
              if (chosen) open([], values.prompt, chosen);
            }}
          />
          {saved && (
            <Action.SubmitForm
              icon={Icon.Replace}
              title={`Continue Last Conversation (${savedTurns} Turn${savedTurns === 1 ? "" : "s"})`}
              onSubmit={(values: { prompt: string; model: string }) => {
                // Empty prompt is fine here — open the chat on the saved
                // history and let the user follow up from there.
                const chosen = values.prompt.trim()
                  ? resolveModel(values.model)
                  : saved.model;
                if (chosen) open(saved.messages, values.prompt.trim(), chosen);
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Ask anything…"
        autoFocus
      />
      <Form.Dropdown
        id="model"
        title="Model"
        defaultValue={initialSelected}
        info="Live models available to your EveryAPI account. Change the remembered default with Switch Default Model."
      >
        {dropdownItems.map((m) => (
          <Form.Dropdown.Item
            key={m}
            value={m}
            title={m}
            icon={modelProviderIcon(m) ?? Icon.ComputerChip}
          />
        ))}
      </Form.Dropdown>
      {saved && (
        <Form.Description
          text={`Last conversation: ${savedTurns} turn${savedTurns === 1 ? "" : "s"} · ${saved.model} — continue it from the action menu (⌘K).`}
        />
      )}
    </Form>
  );
}

function Chat({
  initialMessages,
  initialPrompt,
  initialModel,
  models,
  session,
  origin,
}: {
  initialMessages: ChatMessage[];
  initialPrompt: string;
  initialModel: string;
  models: string[];
  session: AuthSession;
  origin: string;
}) {
  const { push } = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [model, setModel] = useState(initialModel);
  const [stream, setStream] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // send() reads conversation state from refs so a follow-up submitted
  // from the pushed form (a different React tree) can't capture a stale
  // closure over `messages`/`model`.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const modelRef = useRef(model);
  modelRef.current = model;
  // Bumped by Clear Conversation so an in-flight send() doesn't commit a
  // reply built on top of history the user just discarded.
  const genRef = useRef(0);

  const send = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || busy) return;
    const gen = genRef.current;
    const useModel = modelRef.current;
    const history = [
      ...messagesRef.current,
      { role: "user" as const, content: text },
    ];
    setMessages(history);
    setBusy(true);
    setStream("");

    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = Date.now();
    let buf = "";
    let usageTokens: number | undefined;
    let stopped = false;

    const run = async (withUsage: boolean) => {
      const result = await streamChatCompletion({
        auth: session,
        origin,
        model: useModel,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        includeUsage: withUsage,
        signal: controller.signal,
        onDelta: (delta) => {
          buf += delta;
          setStream(buf);
        },
      });
      usageTokens = result.totalTokens;
    };

    try {
      try {
        await run(true);
      } catch (e) {
        // Some upstream channels 4xx on stream_options — retry once
        // without it, unless the user is the one who aborted or we
        // already streamed partial content.
        if (
          controller.signal.aborted ||
          buf.length > 0 ||
          !shouldRetryWithoutUsage(e)
        ) {
          throw e;
        }
        await run(false);
      }
    } catch (e) {
      if (controller.signal.aborted) {
        stopped = true;
      } else {
        if (isModelNotFound(e)) await markModelUnavailable(useModel);
        const explanation = explainAIError(e);
        buf +=
          (buf ? "\n\n" : "") +
          `## ${explanation.title}\n\n${explanation.message}`;
      }
    }

    const reply: ChatMessage = {
      role: "assistant",
      content: buf || "_(no content)_",
      model: useModel,
      tokens:
        usageTokens ??
        estimateTokens(history.map((m) => m.content).join("")) +
          estimateTokens(buf),
      estimated: usageTokens === undefined,
      ms: Date.now() - t0,
      stopped,
    };
    setStream(null);
    setBusy(false);
    abortRef.current = null;
    if (gen !== genRef.current) return; // conversation was cleared mid-flight
    const next = [...history, reply].slice(-MAX_TURNS);
    setMessages(next);
    await saveConversation(next, useModel);
  };

  // Fire the initial prompt exactly once on mount. "Continue Last
  // Conversation" with an empty prompt just opens the history.
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (initialPrompt.trim()) void send(initialPrompt);
  }, []);

  const lastAnswer =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const turns = messages.filter((m) => m.role === "user").length;
  const conversationTurns = messages
    .map((message, index) => {
      if (message.role !== "user") return null;
      const reply = messages[index + 1];
      return {
        id: String(index),
        prompt: message.content,
        reply:
          reply?.role === "assistant"
            ? reply
            : stream !== null
              ? ({
                  role: "assistant",
                  content: stream || `_${model} is responding…_`,
                  model,
                } satisfies ChatMessage)
              : undefined,
      };
    })
    .filter((turn): turn is NonNullable<typeof turn> => turn !== null);

  const actions = (
    <ActionPanel>
      {busy ? (
        <Action
          title="Stop Streaming"
          icon={Icon.Stop}
          onAction={() => abortRef.current?.abort()}
        />
      ) : (
        <Action
          title="Ask Follow-Up"
          icon={Icon.Reply}
          onAction={() =>
            push(<FollowUp onSubmit={(text) => void send(text)} />)
          }
        />
      )}
      <Action.CopyToClipboard
        title="Copy Last Answer"
        content={lastAnswer}
        icon={Icon.Clipboard}
      />
      <Action.Paste
        title="Paste Last Answer"
        content={lastAnswer}
        icon={Icon.Document}
      />
      {models.length > 0 && (
        <ActionPanel.Submenu
          title="Switch Model"
          icon={Icon.Switch}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "m" },
            Windows: { modifiers: ["ctrl"], key: "m" },
          }}
        >
          {models.map((m) => (
            <Action
              key={m}
              title={m === model ? `${m} (Current)` : m}
              icon={modelProviderIcon(m) ?? Icon.ComputerChip}
              onAction={() => setModel(m)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title="Clear Conversation"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
          Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
        }}
        onAction={async () => {
          genRef.current += 1;
          abortRef.current?.abort();
          await LocalStorage.removeItem(CONVO_KEY);
          setMessages([]);
        }}
      />
    </ActionPanel>
  );

  const latestReply = conversationTurns.at(-1)?.reply;
  const latestModel = latestReply?.model || model;

  return (
    <Detail
      isLoading={busy}
      navigationTitle={`Ask · ${turns} turn${turns === 1 ? "" : "s"}`}
      markdown={latestReply?.content || "_Waiting for a response…_"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Model"
            text={latestModel}
            icon={modelProviderIcon(latestModel) ?? Icon.ComputerChip}
          />
          {latestReply?.tokens ? (
            <Detail.Metadata.Label
              title="Tokens"
              text={`${latestReply.estimated ? "~" : ""}${fmtTokens(latestReply.tokens)}`}
              icon={Icon.Gauge}
            />
          ) : null}
          {latestReply?.ms ? (
            <Detail.Metadata.Label
              title="Latency"
              text={`${(latestReply.ms / 1000).toFixed(1)}s`}
              icon={Icon.Clock}
            />
          ) : null}
          <Detail.Metadata.Label
            title="Conversation"
            text={`${turns} turn${turns === 1 ? "" : "s"}`}
            icon={Icon.Message}
          />
        </Detail.Metadata>
      }
      actions={actions}
    />
  );
}

function FollowUp({ onSubmit }: { onSubmit: (text: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Ask Follow-Up"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ArrowRight}
            title="Send"
            onSubmit={(values: { prompt: string }) => {
              if (!values.prompt.trim()) {
                void showFailureToast("Type a prompt first", {
                  title: "Empty prompt",
                });
                return;
              }
              pop();
              onSubmit(values.prompt);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Follow-Up"
        placeholder="Continue the conversation — full history is sent as context."
        autoFocus
      />
    </Form>
  );
}
