import { Action, ActionPanel, Icon, Image, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Effort, runClaude } from "../lib/claude";
import {
  Attachment,
  attachmentLabel,
  buildRequest,
  Conversation,
  createConversation,
  deleteConversation,
  loadConversation,
  saveConversation,
  toApiContent,
  toApiMessages,
  Turn,
  turnTitle,
} from "../lib/conversations";
import { describeError, showError } from "../lib/errors";
import { formatUsd, isModelId, MODEL_IDS, ModelId, modelLabel, MODELS } from "../lib/models";
import { chatSystem, defaultRequest } from "../lib/prompts";
import { Settings, settings, today } from "../lib/settings";
import { speak } from "../lib/system";
import {
  blockquote,
  codeBlocks,
  fileUrl,
  formatDuration,
  formatNumber,
  guessLanguageCode,
  markdownToPlain,
  newId,
  oneLine,
  throttle,
  truncate,
} from "../lib/text";
import { recordUsage } from "../lib/usage";
import { ConversationList } from "./ConversationList";

export interface ChatSeed {
  /** The visible message; sent at once with `send`, otherwise placed in the search bar. */
  prompt?: string;
  attachments?: Attachment[];
  /** Sent instead of `prompt` when a preset shows a short title but needs a longer instruction. */
  instruction?: string;
  send?: boolean;
  placeholder?: string;
  model?: ModelId;
  effort?: Effort;
}

export interface ChatProps {
  /** A conversation to continue, loaded from disk; the view shows a loading state meanwhile. */
  conversationId?: string;
  seed?: ChatSeed;
  /** Only for pushed screens: root commands keep Raycast's own title. */
  navigationTitle?: string;
}

interface Live {
  turnId: string;
  text: string;
  activity?: string;
}

const STRONGER: Partial<Record<ModelId, ModelId>> = {
  "claude-haiku-5-5": "claude-sonnet-5-5",
  "claude-sonnet-5-5": "claude-opus-5-5",
  "claude-opus-5-5": "claude-fable-5-1",
};

function newConversation(s: Settings, seed?: ChatSeed): Conversation {
  return createConversation({
    model: seed?.model ?? s.model,
    effort: seed?.effort,
    webSearch: s.webSearch,
    system: chatSystem({ date: today(), primary: s.langs.primary, webSearch: s.webSearch, custom: s.custom }),
  });
}

function attachmentKind(attachments: Attachment[]): "page" | "image" | "selection" {
  const kinds = new Set(attachments.map((a) => a.kind));
  return kinds.has("page") ? "page" : kinds.has("image") ? "image" : "selection";
}

function attachmentIcon(a: Attachment): Image.ImageLike {
  return a.kind === "image" ? Icon.Camera : a.kind === "page" ? Icon.Globe : Icon.TextCursor;
}

function attachmentPreview(a: Attachment): string {
  switch (a.kind) {
    case "selection":
      return `**${attachmentLabel(a)}**\n\n${blockquote(truncate(a.text, 6000))}`;
    case "page":
      return `**${a.title}**\n\n${a.url}\n\n${blockquote(truncate(a.text, 3000))}`;
    case "image":
      return `![Screenshot](${fileUrl(a.path)}?raycast-height=320)`;
  }
}

function footer(turn: Turn): string {
  const u = turn.usage;
  if (!u) return "";
  const parts = [modelLabel(u.model)];
  if (turn.durationMs) parts.push(formatDuration(turn.durationMs));
  parts.push(`↑${formatNumber(u.input + u.cacheRead + u.cacheWrite)} ↓${formatNumber(u.output)} tokens`);
  if (u.webSearches) parts.push(u.webSearches === 1 ? "1 search" : `${u.webSearches} searches`);
  parts.push(formatUsd(u.cost));
  return `_${parts.join(" · ")}_`;
}

function turnMarkdown(turn: Turn, live?: Live): string {
  const sections: string[] = [];
  const notes = turn.attachments.filter((a) => a.kind !== "image").map((a) => `📎 ${attachmentLabel(a)}`);
  const quote = [turn.prompt.trim(), ...notes].filter(Boolean).join("\n\n");
  if (quote) sections.push(blockquote(quote));
  for (const a of turn.attachments) {
    if (a.kind === "image") sections.push(`![Screenshot](${fileUrl(a.path)}?raycast-height=180)`);
  }

  if (live) {
    if (live.text) sections.push(live.text);
    if (live.activity || !live.text) sections.push(`_${live.activity ?? "Thinking…"}_`);
    return sections.join("\n\n");
  }

  if (turn.answer) sections.push(turn.answer);
  if (turn.truncated) sections.push("_⚠️ The reply was cut off at the length limit._");
  if (turn.error) sections.push(`> ⚠️ ${turn.error}`);
  if (turn.sources.length) {
    const links = turn.sources.map((s, i) => `${i + 1}. [${s.title.replace(/[[\]]/g, "")}](${s.url})`);
    sections.push(`**Sources**\n\n${links.join("\n")}`);
  }
  if (turn.usage) sections.push(footer(turn));
  return sections.join("\n\n");
}

export function Chat(props: ChatProps) {
  const { seed } = props;
  const [s] = useState(settings);
  const [conversation, setConversation] = useState<Conversation | undefined>(() =>
    props.conversationId ? undefined : newConversation(s, seed),
  );
  const [input, setInput] = useState(seed && !seed.send ? (seed.prompt ?? "") : "");
  const [pending, setPending] = useState<Attachment[]>(seed && !seed.send ? (seed.attachments ?? []) : []);
  const [live, setLive] = useState<Live>();
  /** One-shot focus: kept only briefly so Raycast's own selection isn't fought while streaming. */
  const [focusId, setFocusId] = useState<string>();
  const current = useRef(conversation);
  const abort = useRef<AbortController>(undefined);
  const busy = useRef(false);
  const seeded = useRef(false);
  const mounted = useRef(false);

  function update(change: (c: Conversation) => Conversation) {
    if (!current.current) return;
    current.current = change(current.current);
    setConversation(current.current);
  }

  function patchTurn(id: string, patch: Partial<Turn>) {
    update((c) => ({ ...c, turns: c.turns.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }

  useEffect(() => {
    if (!props.conversationId) return;
    let cancelled = false;
    void loadConversation(props.conversationId).then((loaded) => {
      if (cancelled) return;
      current.current = loaded ?? newConversation(s);
      setConversation(current.current);
      if (!loaded) void showToast({ style: Toast.Style.Failure, title: "Conversation not found" });
    });
    return () => {
      cancelled = true;
    };
  }, [props.conversationId]);

  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => setFocusId(undefined), 400);
    return () => clearTimeout(timer);
  }, [focusId]);

  useEffect(() => {
    mounted.current = true;
    if (seed?.send && !seeded.current) {
      seeded.current = true;
      void send(seed.prompt ?? "", seed.attachments ?? [], seed.instruction);
    }
    return () => {
      mounted.current = false;
      // Development builds run effects twice (React StrictMode): abort only if the view stays gone.
      setTimeout(() => {
        if (!mounted.current) abort.current?.abort();
      }, 0);
    };
  }, []);

  async function send(prompt: string, attachments: Attachment[], instruction?: string) {
    if (busy.current) {
      await showToast({ style: Toast.Style.Failure, title: "Wait for the current answer to finish" });
      return;
    }
    let text = prompt.trim();
    let hidden = instruction;
    if (!text && attachments.length) {
      const fallback = defaultRequest(attachmentKind(attachments), s.langs);
      text = fallback.prompt;
      hidden ??= fallback.instruction;
    }
    if (!text && !hidden) return;
    setInput("");
    setPending([]);
    await run(
      { prompt: text, attachments, request: buildRequest(text, attachments, hidden) },
      current.current?.model ?? s.model,
      !prompt.trim(),
    );
  }

  /** `generated`: the visible prompt was filled in for the user, so a failure doesn't restore it. */
  async function run(skeleton: Pick<Turn, "prompt" | "attachments" | "request">, model: ModelId, generated = false) {
    if (busy.current || !current.current) return;
    busy.current = true;
    const conversationId = current.current.id;
    const history = current.current.turns;
    const turn: Turn = { id: newId(), createdAt: Date.now(), ...skeleton, replies: [], answer: "", sources: [] };
    update((c) => ({ ...c, model, updatedAt: Date.now(), turns: [...c.turns, turn] }));
    setFocusId(turn.id);
    setLive({ turnId: turn.id, text: "" });

    const controller = new AbortController();
    abort.current = controller;
    let streamed = "";
    // Every update re-sends the whole list, so long conversations refresh less often.
    const showText = throttle(
      (text: string) => setLive((l) => (l?.turnId === turn.id ? { ...l, text } : l)),
      history.length > 6 ? 160 : 80,
    );

    try {
      const c = current.current;
      const messages = [
        ...(await toApiMessages(history)),
        { role: "user" as const, content: await toApiContent(turn.request) },
      ];
      const result = await runClaude({
        apiKey: s.apiKey,
        model,
        system: c.system,
        messages,
        effort: c.effort ?? s.chatEffort,
        webSearch: c.webSearch,
        conversation: true,
        signal: controller.signal,
        onText: (text) => {
          streamed = text;
          showText(text);
        },
        onActivity: (activity) => setLive((l) => (l?.turnId === turn.id ? { ...l, activity } : l)),
      });
      showText.cancel();
      patchTurn(turn.id, {
        answer: result.text,
        replies: result.assistantMessages,
        sources: result.sources,
        usage: result.usage,
        durationMs: result.durationMs,
        truncated: result.truncated,
      });
      await recordUsage(result.usage);
    } catch (error) {
      showText.cancel();
      const info = describeError(error);
      if (current.current?.id !== conversationId) return; // a new chat replaced this one
      if (!streamed) {
        // Nothing arrived: take the turn back and return the message so it can be sent again.
        update((c) => ({ ...c, turns: c.turns.filter((t) => t.id !== turn.id) }));
        if (!generated) setInput((text) => text || skeleton.prompt);
        setPending((list) => (list.length ? list : skeleton.attachments));
      } else {
        patchTurn(turn.id, {
          answer: streamed,
          error: info.silent ? "Stopped" : [info.title, info.message].filter(Boolean).join(" — "),
        });
      }
      await showError(error);
    } finally {
      if (abort.current === controller) abort.current = undefined;
      busy.current = false;
      setLive(undefined);
      if (current.current) await saveConversation(current.current);
    }
  }

  async function regenerate(turn: Turn, model?: ModelId) {
    if (busy.current || !current.current) return;
    update((c) => ({ ...c, turns: c.turns.filter((t) => t.id !== turn.id) }));
    await run(
      { prompt: turn.prompt, attachments: turn.attachments, request: turn.request },
      model ?? current.current.model,
      true,
    );
  }

  function editTurn(turn: Turn) {
    if (busy.current) return;
    update((c) => ({ ...c, turns: c.turns.filter((t) => t.id !== turn.id) }));
    setInput(turn.prompt);
    setPending(turn.attachments);
  }

  async function removeTurn(turn: Turn) {
    update((c) => ({ ...c, turns: c.turns.filter((t) => t.id !== turn.id) }));
    if (!current.current) return;
    if (current.current.turns.some((t) => t.replies.length)) await saveConversation(current.current);
    else await deleteConversation(current.current.id);
  }

  function newChat() {
    abort.current?.abort();
    current.current = newConversation(s);
    setConversation(current.current);
    setInput("");
    setPending([]);
    setLive(undefined);
  }

  function changeModel(model: string) {
    if (!isModelId(model) || !current.current || model === current.current.model) return;
    update((c) => ({ ...c, model }));
    if (current.current) void saveConversation(current.current);
  }

  if (!conversation) {
    return <List isLoading navigationTitle={props.navigationTitle} searchBarPlaceholder="Loading conversation…" />;
  }

  const turns = [...conversation.turns].reverse();
  const last = conversation.turns[conversation.turns.length - 1];
  const canSend = input.trim().length > 0 || pending.length > 0;
  const placeholder = conversation.turns.length
    ? "Ask a follow-up…"
    : (seed?.placeholder ??
      (pending.length ? "Ask about the attachment, or press ↵ for an explanation…" : "Ask Claude…"));

  function actions(turn?: Turn, attachmentIndex?: number) {
    const lastTurn = turn && turn.id === last?.id && !live ? turn : undefined;
    const stronger = conversation ? STRONGER[conversation.model] : undefined;
    const code = turn?.answer ? codeBlocks(turn.answer) : [];
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {canSend && <Action title="Send" icon={Icon.ArrowRight} onAction={() => void send(input, pending)} />}
          {turn?.answer && (
            <Action.CopyToClipboard
              title="Copy Answer"
              content={turn.answer}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
          {turn?.answer && (
            <Action.Paste
              title="Paste Answer"
              content={turn.answer}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          )}
          {turn?.answer && (
            <Action.Paste
              title="Paste as Plain Text"
              icon={Icon.Text}
              content={markdownToPlain(turn.answer)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          {live && (
            <Action
              title="Stop"
              icon={Icon.Stop}
              // ⌘. is the macOS "stop" key; it only coincides with Common.Pin.
              // eslint-disable-next-line @raycast/prefer-common-shortcut
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={() => abort.current?.abort()}
            />
          )}
          {lastTurn && (
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => void regenerate(lastTurn)}
            />
          )}
          {lastTurn && stronger && (
            <Action
              title={`Retry with ${MODELS[stronger].short}`}
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => void regenerate(lastTurn, stronger)}
            />
          )}
          {lastTurn && (
            <Action
              title="Edit Question"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => editTurn(lastTurn)}
            />
          )}
          {code.length === 1 && (
            <Action.CopyToClipboard
              title="Copy Code"
              icon={Icon.Code}
              content={code[0]}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          )}
          {code.length > 1 && (
            <ActionPanel.Submenu title="Copy Code…" icon={Icon.Code} shortcut={Keyboard.Shortcut.Common.CopyName}>
              {code.map((block, i) => (
                <Action.CopyToClipboard key={i} title={oneLine(block, 60) || `Block ${i + 1}`} content={block} />
              ))}
            </ActionPanel.Submenu>
          )}
          {turn && turn.sources.length > 0 && (
            <ActionPanel.Submenu title="Open Source…" icon={Icon.Globe} shortcut={Keyboard.Shortcut.Common.Open}>
              {turn.sources.map((source) => (
                <Action.OpenInBrowser key={source.url} title={source.title} url={source.url} />
              ))}
            </ActionPanel.Submenu>
          )}
          {turn?.answer && (
            <Action
              title="Read Aloud"
              icon={Icon.SpeakerOn}
              shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
              onAction={() => {
                const text = markdownToPlain(turn.answer);
                void speak(text, guessLanguageCode(text));
              }}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action title="New Chat" icon={Icon.PlusCircle} shortcut={Keyboard.Shortcut.Common.New} onAction={newChat} />
          <Action.Push
            title="Show Conversations"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            target={<ConversationList nested />}
          />
          {attachmentIndex !== undefined && (
            <Action
              title="Remove Attachment"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => setPending((list) => list.filter((_, i) => i !== attachmentIndex))}
            />
          )}
          {turn && !live && (
            <Action
              title="Delete Message"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => void removeTurn(turn)}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const showDetail = turns.length > 0 || pending.length > 0;

  return (
    <List
      isLoading={!!live}
      isShowingDetail={showDetail}
      filtering={false}
      searchText={input}
      onSearchTextChange={setInput}
      searchBarPlaceholder={placeholder}
      navigationTitle={props.navigationTitle}
      selectedItemId={focusId}
      searchBarAccessory={
        <List.Dropdown tooltip="Model" value={conversation.model} onChange={changeModel}>
          {MODEL_IDS.map((id) => (
            <List.Dropdown.Item key={id} value={id} title={MODELS[id].short} />
          ))}
        </List.Dropdown>
      }
    >
      {!showDetail && (
        <List.EmptyView
          icon={{ source: "icon.png" }}
          title="Ask Claude"
          description={`Type a question and press ↵.  ⌘⇧H shows past conversations${s.webSearch ? " · searches the web when needed" : ""}`}
          actions={actions()}
        />
      )}
      {pending.map((attachment, index) => (
        <List.Item
          key={`pending-${index}`}
          id={`pending-${index}`}
          icon={attachmentIcon(attachment)}
          title={attachmentLabel(attachment)}
          accessories={[{ tag: "Attachment" }]}
          detail={<List.Item.Detail markdown={attachmentPreview(attachment)} />}
          actions={actions(undefined, index)}
        />
      ))}
      {turns.map((turn) => {
        const streaming = live?.turnId === turn.id ? live : undefined;
        return (
          <List.Item
            key={turn.id}
            id={turn.id}
            icon={
              streaming
                ? Icon.CircleProgress
                : turn.error
                  ? Icon.Warning
                  : turn.attachments.length
                    ? attachmentIcon(turn.attachments[0])
                    : Icon.Message
            }
            title={turnTitle(turn)}
            accessories={
              turn.usage ? [{ text: formatUsd(turn.usage.cost), tooltip: modelLabel(turn.usage.model) }] : undefined
            }
            detail={<List.Item.Detail markdown={turnMarkdown(turn, streaming)} />}
            actions={actions(turn)}
          />
        );
      })}
    </List>
  );
}
